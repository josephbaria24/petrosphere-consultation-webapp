/**
 * Admin API: compare and migrate survey responses from one org survey to another.
 * POST body:
 *  { action: "compare" | "execute", sourceOrgId, destOrgId, sourceSurveyId, destSurveyId, skipConflicts?: boolean }
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";
import {
  collectDimensionCodes,
  matchSurveyQuestions,
  type QuestionMatch,
  type SurveyQuestionRow,
} from "../../../../lib/migrate-survey-responses";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadSurveyQuestions(
  supabase: SupabaseClient,
  surveyId: string
): Promise<SurveyQuestionRow[]> {
  const { data, error } = await supabase
    .from("survey_questions")
    .select(
      "id, survey_id, question_text, question_type, options, order_index, dimension, dimension_code, scoring_type, max_score, min_score, reverse_score"
    )
    .eq("survey_id", surveyId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data || []) as SurveyQuestionRow[];
}

async function loadSurveyMeta(
  supabase: SupabaseClient,
  surveyId: string
): Promise<{ id: string; title: string; org_id: string | null } | null> {
  const { data, error } = await supabase
    .from("surveys")
    .select("id, title, org_id")
    .eq("id", surveyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadOrgDimensionCodes(
  supabase: SupabaseClient,
  orgId: string
): Promise<string[]> {
  // Prefer dimension sets scoped to org + global (org_id null)
  const { data: sets } = await supabase
    .from("dimension_sets")
    .select("id, org_id")
    .or(`org_id.eq.${orgId},org_id.is.null`);

  const setIds = (sets || []).map((s) => s.id);
  if (!setIds.length) {
    const { data: dims } = await supabase.from("dimensions").select("code");
    return Array.from(
      new Set((dims || []).map((d) => String(d.code || "").trim()).filter(Boolean))
    ).sort();
  }

  const { data: dims } = await supabase
    .from("dimensions")
    .select("code, set_id")
    .in("set_id", setIds);

  return Array.from(
    new Set((dims || []).map((d) => String(d.code || "").trim()).filter(Boolean))
  ).sort();
}

type ResponseRow = {
  id: string;
  user_id: string;
  question_id: string;
  answer: string | null;
  role?: string | null;
  dimension?: string | null;
  question?: string | null;
  org_id?: string | null;
  created_at?: string | null;
};

async function loadSourceResponses(
  supabase: SupabaseClient,
  sourceOrgId: string,
  sourceQuestionIds: string[]
): Promise<ResponseRow[]> {
  if (!sourceQuestionIds.length) return [];
  // Chunk IN filters to avoid URL limits
  const chunkSize = 100;
  const rows: ResponseRow[] = [];
  for (let i = 0; i < sourceQuestionIds.length; i += chunkSize) {
    const chunk = sourceQuestionIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("responses")
      .select(
        "id, user_id, question_id, answer, role, dimension, question, org_id, created_at"
      )
      .eq("org_id", sourceOrgId)
      .in("question_id", chunk);
    if (error) throw error;
    rows.push(...((data || []) as ResponseRow[]));
  }
  return rows;
}

async function loadDestCollisionKeys(
  supabase: SupabaseClient,
  destOrgId: string,
  destQuestionIds: string[]
): Promise<Set<string>> {
  const keys = new Set<string>();
  if (!destQuestionIds.length) return keys;
  const chunkSize = 100;
  for (let i = 0; i < destQuestionIds.length; i += chunkSize) {
    const chunk = destQuestionIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("responses")
      .select("user_id, question_id")
      .eq("org_id", destOrgId)
      .in("question_id", chunk);
    if (error) throw error;
    for (const r of data || []) {
      keys.add(`${r.user_id}::${r.question_id}`);
    }
  }
  return keys;
}

function buildCompareReport(args: {
  sourceOrgId: string;
  destOrgId: string;
  sourceSurvey: { id: string; title: string; org_id: string | null };
  destSurvey: { id: string; title: string; org_id: string | null };
  matches: QuestionMatch[];
  sourceResponses: ResponseRow[];
  destCollisionKeys: Set<string>;
  sourceDimCodes: string[];
  destSurveyDimCodes: string[];
  destOrgDimCodes: string[];
}) {
  const {
    matches,
    sourceResponses,
    destCollisionKeys,
    sourceDimCodes,
    destSurveyDimCodes,
    destOrgDimCodes,
  } = args;

  const matched = matches.filter((m) => m.destQuestionId);
  const unmatched = matches.filter((m) => !m.destQuestionId);
  const warningMatches = matched.filter((m) => m.warnings.length > 0);

  const sourceQIds = new Set(matches.map((m) => m.sourceQuestionId));
  const mapBySource = new Map(
    matched.map((m) => [m.sourceQuestionId, m.destQuestionId!])
  );

  let migratable = 0;
  let conflictCount = 0;
  let skippedUnmatched = 0;
  const respondents = new Set<string>();

  for (const r of sourceResponses) {
    if (!sourceQIds.has(r.question_id)) continue;
    respondents.add(r.user_id);
    const destQ = mapBySource.get(r.question_id);
    if (!destQ) {
      skippedUnmatched += 1;
      continue;
    }
    const key = `${r.user_id}::${destQ}`;
    if (destCollisionKeys.has(key)) {
      conflictCount += 1;
    } else {
      migratable += 1;
    }
  }

  const missingOnDestSurvey = sourceDimCodes.filter(
    (c) => !destSurveyDimCodes.map((x) => x.toLowerCase()).includes(c.toLowerCase())
  );
  const missingInDestOrgCatalog = sourceDimCodes.filter(
    (c) => !destOrgDimCodes.map((x) => x.toLowerCase()).includes(c.toLowerCase())
  );

  const blockingIssues: string[] = [];
  if (args.sourceOrgId === args.destOrgId) {
    blockingIssues.push("Source and destination organization must be different.");
  }
  if (args.sourceSurvey.id === args.destSurvey.id) {
    blockingIssues.push("Source and destination survey must be different.");
  }
  if (matched.length === 0) {
    blockingIssues.push(
      "No questions could be matched between the surveys — migration cannot proceed."
    );
  }
  if (conflictCount > 0) {
    blockingIssues.push(
      `${conflictCount} response(s) already exist on the destination for the same respondent + question (will be skipped unless you force).`
    );
  }

  const softWarnings: string[] = [];
  if (unmatched.length > 0) {
    softWarnings.push(
      `${unmatched.length} source question(s) have no match — their responses will be skipped.`
    );
  }
  if (warningMatches.length > 0) {
    softWarnings.push(
      `${warningMatches.length} matched question(s) have type/options/scoring/dimension differences.`
    );
  }
  if (missingOnDestSurvey.length > 0) {
    softWarnings.push(
      `Dimension codes on source survey missing from destination survey questions: ${missingOnDestSurvey.join(", ")}`
    );
  }
  if (missingInDestOrgCatalog.length > 0) {
    softWarnings.push(
      `Dimension codes not found in destination org/global catalog: ${missingInDestOrgCatalog.join(", ")}`
    );
  }
  if (migratable === 0 && conflictCount === 0) {
    softWarnings.push("No responses are currently migratable under the selected mapping.");
  }

  const canMigrate =
    !blockingIssues.some((i) => !i.includes("already exist")) &&
    matched.length > 0 &&
    (migratable > 0 || conflictCount > 0);

  return {
    sourceSurvey: args.sourceSurvey,
    destSurvey: args.destSurvey,
    summary: {
      sourceQuestionCount: matches.length,
      destQuestionCount: new Set(
        matches.map((m) => m.destQuestionId).filter(Boolean)
      ).size,
      exactMatches: matched.filter((m) => m.status === "exact").length,
      strongMatches: matched.filter((m) => m.status === "strong").length,
      weakMatches: matched.filter((m) => m.status === "weak").length,
      unmatchedQuestions: unmatched.length,
      sourceResponseCount: sourceResponses.length,
      uniqueRespondents: respondents.size,
      migratableResponses: migratable,
      conflictingResponses: conflictCount,
      responsesOnUnmatchedQuestions: skippedUnmatched,
    },
    dimensions: {
      sourceCodes: sourceDimCodes,
      destSurveyCodes: destSurveyDimCodes,
      destOrgCatalogCodes: destOrgDimCodes,
      missingOnDestSurvey,
      missingInDestOrgCatalog,
    },
    matches,
    unmatchedQuestions: unmatched,
    blockingIssues,
    softWarnings,
    canMigrate,
  };
}

export async function POST(req: Request) {
  try {
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      action,
      sourceOrgId,
      destOrgId,
      sourceSurveyId,
      destSurveyId,
      skipConflicts = true,
    } = body || {};

    if (!action || !sourceOrgId || !destOrgId || !sourceSurveyId || !destSurveyId) {
      return NextResponse.json(
        {
          error:
            "action, sourceOrgId, destOrgId, sourceSurveyId, and destSurveyId are required",
        },
        { status: 400 }
      );
    }

    if (sourceOrgId === destOrgId) {
      return NextResponse.json(
        { error: "Source and destination organizations must differ" },
        { status: 400 }
      );
    }
    if (sourceSurveyId === destSurveyId) {
      return NextResponse.json(
        { error: "Source and destination surveys must differ" },
        { status: 400 }
      );
    }

    const supabase = adminClient();
    const [sourceSurvey, destSurvey] = await Promise.all([
      loadSurveyMeta(supabase, sourceSurveyId),
      loadSurveyMeta(supabase, destSurveyId),
    ]);

    if (!sourceSurvey || !destSurvey) {
      return NextResponse.json(
        { error: "Source or destination survey not found" },
        { status: 404 }
      );
    }

    const [sourceQuestions, destQuestions] = await Promise.all([
      loadSurveyQuestions(supabase, sourceSurveyId),
      loadSurveyQuestions(supabase, destSurveyId),
    ]);

    const matches = matchSurveyQuestions(sourceQuestions, destQuestions);
    const matched = matches.filter((m) => m.destQuestionId);
    const mapBySource = new Map(
      matched.map((m) => [m.sourceQuestionId, m] as const)
    );

    const sourceResponses = await loadSourceResponses(
      supabase,
      sourceOrgId,
      sourceQuestions.map((q) => q.id)
    );

    const destQuestionIds = matched
      .map((m) => m.destQuestionId!)
      .filter(Boolean);
    const destCollisionKeys = await loadDestCollisionKeys(
      supabase,
      destOrgId,
      destQuestionIds
    );

    const sourceDimCodes = collectDimensionCodes(sourceQuestions);
    const destSurveyDimCodes = collectDimensionCodes(destQuestions);
    const destOrgDimCodes = await loadOrgDimensionCodes(supabase, destOrgId);

    const report = buildCompareReport({
      sourceOrgId,
      destOrgId,
      sourceSurvey,
      destSurvey,
      matches,
      sourceResponses,
      destCollisionKeys,
      sourceDimCodes,
      destSurveyDimCodes,
      destOrgDimCodes,
    });

    if (action === "compare") {
      return NextResponse.json(report);
    }

    if (action !== "execute") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // Hard-block if unmatched questions exist (responses would be left behind)
    const hardBlocks = report.blockingIssues.filter(
      (i) => !i.includes("already exist")
    );
    if (hardBlocks.length > 0 && matched.length === 0) {
      return NextResponse.json(
        { error: "Cannot migrate", details: hardBlocks, report },
        { status: 400 }
      );
    }

    let moved = 0;
    let skippedConflict = 0;
    let skippedUnmatched = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    const updates: {
      id: string;
      question_id: string;
      org_id: string;
      question: string | null;
      dimension: string | null;
    }[] = [];

    for (const r of sourceResponses) {
      const match = mapBySource.get(r.question_id);
      if (!match?.destQuestionId) {
        skippedUnmatched += 1;
        continue;
      }
      const key = `${r.user_id}::${match.destQuestionId}`;
      if (destCollisionKeys.has(key)) {
        if (skipConflicts) {
          skippedConflict += 1;
          continue;
        }
      }
      updates.push({
        id: r.id,
        question_id: match.destQuestionId,
        org_id: destOrgId,
        question: match.destText,
        dimension: match.destDimension || match.sourceDimension,
      });
    }

    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          const { error } = await supabase
            .from("responses")
            .update({
              question_id: u.question_id,
              org_id: u.org_id,
              question: u.question,
              dimension: u.dimension,
            })
            .eq("id", u.id);
          if (error) {
            failed += 1;
            errors.push(`${u.id}: ${error.message}`);
          } else {
            moved += 1;
          }
        })
      );
    }

    return NextResponse.json({
      ok: failed === 0,
      moved,
      skippedConflict,
      skippedUnmatched,
      failed,
      errors: errors.slice(0, 20),
      report,
    });
  } catch (error: any) {
    console.error("migrate-responses error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
