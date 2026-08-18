/**
 * Admin API: compare, copy, restore, and list survey-response migrations.
 * Source rows are never updated or deleted.
 *
 * POST body:
 *  { action: "compare" | "execute" | "list" | "restore", ... }
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";
import {
  collectDimensionCodes,
  collectDimensionLabels,
  reverseScaleAnswer,
  summarizeSourceAnswers,
  type QuestionMatch,
  type SurveyQuestionRow,
} from "../../../../lib/migrate-survey-responses";
import {
  loadOrgName,
  planCopies,
  prepareCopyPlan,
  type MigrationRecord,
  type PlannedCopy,
  type ResponseRow,
} from "../../../../lib/server/migrate-responses";

export const runtime = "nodejs";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadOrgDimensionCodes(
  supabase: SupabaseClient,
  orgId: string
): Promise<string[]> {
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

function buildCompareReport(args: {
  sourceOrgId: string;
  destOrgId: string;
  sourceSurvey: { id: string; title: string; org_id: string | null };
  destSurvey: { id: string; title: string; org_id: string | null };
  matches: QuestionMatch[];
  destQuestions: SurveyQuestionRow[];
  sourceResponses: ResponseRow[];
  destCollisionKeys: Set<string>;
  sourceDimCodes: string[];
  destSurveyDimCodes: string[];
  destOrgDimCodes: string[];
  sourceDimLabels: string[];
  destSurveyDimLabels: string[];
}) {
  const {
    matches,
    sourceResponses,
    destCollisionKeys,
    sourceDimCodes,
    destSurveyDimCodes,
    destOrgDimCodes,
    sourceDimLabels,
    destSurveyDimLabels,
  } = args;

  const planned = planCopies({
    sourceResponses,
    matches,
    destCollisionKeys,
  });
  const matched = matches.filter((m) => m.destQuestionId);
  const unmatched = matches.filter((m) => !m.destQuestionId);
  const warningMatches = matched.filter((m) =>
    m.warnings.some(
      (w) =>
        w !== "Dimension code naming differs (same label)" &&
        w !== "Manually mapped — wording may differ"
    )
  );
  const codeNamingOnly = matched.filter(
    (m) =>
      m.warnings.length > 0 &&
      m.warnings.every((w) => w === "Dimension code naming differs (same label)")
  );
  const manualMatches = matched.filter((m) => m.status === "manual");

  const respondents = new Set(sourceResponses.map((r) => r.user_id));
  const missingOnDestSurvey = sourceDimLabels.filter(
    (c) =>
      !destSurveyDimLabels.map((x) => x.toLowerCase()).includes(c.toLowerCase())
  );
  const missingInDestOrgCatalog = sourceDimCodes.filter(
    (c) => !destOrgDimCodes.map((x) => x.toLowerCase()).includes(c.toLowerCase())
  );

  const blockingIssues: string[] = [];
  if (args.sourceSurvey.id === args.destSurvey.id) {
    blockingIssues.push("Source and destination survey must be different.");
  }
  if (matched.length === 0) {
    blockingIssues.push(
      "No questions could be matched between the surveys — copy cannot proceed."
    );
  }

  const softWarnings: string[] = [];
  if (planned.skippedConflict.length > 0) {
    softWarnings.push(
      `${planned.skippedConflict.length} destination answer(s) already exist for the same person + question. Those destination rows will be left alone; source rows stay untouched.`
    );
  }
  if (planned.skippedDuplicate.length > 0) {
    softWarnings.push(
      `${planned.skippedDuplicate.length} extra source row(s) are duplicates for the same person + question. The clone still gets one copy of each; extras are skipped so destination does not get double answers.`
    );
  }
  if (unmatched.length > 0) {
    softWarnings.push(
      `${unmatched.length} source question(s) have no match — map them by hand below, or their answers stay on the source survey only.`
    );
  }
  if (manualMatches.length > 0) {
    softWarnings.push(
      `${manualMatches.length} question(s) were mapped by hand because the wording differs.`
    );
  }
  if (warningMatches.length > 0) {
    softWarnings.push(
      `${warningMatches.length} matched question(s) have type/options/scoring/dimension differences.`
    );
  }
  if (codeNamingOnly.length > 0) {
    softWarnings.push(
      `${codeNamingOnly.length} matched question(s) use different dimension codes but the same dimension label (e.g. IR01 → IR). Copies will use the destination labels.`
    );
  }
  if (missingOnDestSurvey.length > 0) {
    softWarnings.push(
      `Dimension labels on source survey missing from destination survey: ${missingOnDestSurvey.join(", ")}`
    );
  }
  if (missingInDestOrgCatalog.length > 0) {
    softWarnings.push(
      `Dimension codes not found in destination org/global catalog: ${missingInDestOrgCatalog.join(", ")}`
    );
  }
  if (planned.toCopy.length === 0) {
    softWarnings.push("No answers are currently copyable under the selected mapping.");
  }

  const canMigrate =
    blockingIssues.length === 0 &&
    matched.length > 0 &&
    planned.toCopy.length > 0;

  return {
    copyMode: true as const,
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
      manualMatches: matched.filter((m) => m.status === "manual").length,
      unmatchedQuestions: unmatched.length,
      sourceResponseCount: sourceResponses.length,
      uniqueRespondents: respondents.size,
      migratableResponses: planned.toCopy.length,
      conflictingResponses: planned.skippedConflict.length,
      duplicateSourceResponses: planned.skippedDuplicate.length,
      responsesOnUnmatchedQuestions: planned.skippedUnmatched.length,
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
    sourceAnswerStats: summarizeSourceAnswers(matches, sourceResponses),
    destQuestionOptions: args.destQuestions.map((q) => ({
      id: q.id,
      text: q.question_text,
      dimension: q.dimension || null,
      dimensionCode: q.dimension_code || null,
      order: q.order_index ?? null,
      options: q.options || [],
      reverseScore: !!q.reverse_score || (q.scoring_type || "").toLowerCase() === "negative",
      scoringType: q.scoring_type || null,
    })),
    blockingIssues,
    softWarnings,
    canMigrate,
  };
}

async function prepareCompare(
  supabase: SupabaseClient,
  args: {
    sourceOrgId: string;
    destOrgId: string;
    sourceSurveyId: string;
    destSurveyId: string;
    questionOverrides?: Record<string, string> | null;
  }
) {
  const prepared = await prepareCopyPlan(supabase, args);
  const report = buildCompareReport({
    sourceOrgId: args.sourceOrgId,
    destOrgId: args.destOrgId,
    sourceSurvey: prepared.sourceSurvey,
    destSurvey: prepared.destSurvey,
    matches: prepared.matches,
    destQuestions: prepared.destQuestions,
    sourceResponses: prepared.sourceResponses,
    destCollisionKeys: prepared.destCollisionKeys,
    sourceDimCodes: collectDimensionCodes(prepared.sourceQuestions),
    destSurveyDimCodes: collectDimensionCodes(prepared.destQuestions),
    destOrgDimCodes: await loadOrgDimensionCodes(supabase, args.destOrgId),
    sourceDimLabels: collectDimensionLabels(prepared.sourceQuestions),
    destSurveyDimLabels: collectDimensionLabels(prepared.destQuestions),
  });
  return { ...prepared, report };
}

function sanitizeAnswerReverse(raw: unknown): Record<string, boolean> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const next: Record<string, boolean> = {};
  for (const [sourceId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof sourceId === "string" && sourceId && typeof value === "boolean") {
      next[sourceId] = value;
    }
  }
  return Object.keys(next).length ? next : undefined;
}

function sanitizeOverrides(
  raw: unknown
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const next: Record<string, string> = {};
  for (const [sourceId, destId] of Object.entries(
    raw as Record<string, unknown>
  )) {
    if (
      typeof sourceId === "string" &&
      sourceId &&
      typeof destId === "string" &&
      destId
    ) {
      next[sourceId] = destId;
    }
  }
  return Object.keys(next).length ? next : undefined;
}

function historyTableHint(message: string) {
  return /response_migrations|schema cache|does not exist/i.test(message)
    ? " Run supabase/migrations/20260817093000_response_migrations.sql in the Supabase SQL editor first."
    : "";
}

async function listMigrations(
  supabase: SupabaseClient
): Promise<MigrationRecord[]> {
  const { data, error } = await supabase
    .from("response_migrations")
    .select(
      "id, created_at, created_by_email, source_org_id, dest_org_id, source_org_name, dest_org_name, source_survey_id, dest_survey_id, source_survey_title, dest_survey_title, status, copied_count, skipped_conflict, skipped_unmatched, failed_count, restored_at, restored_by_email"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message + historyTableHint(error.message));
  return (data || []) as MigrationRecord[];
}

async function copyPlannedRows(
  supabase: SupabaseClient,
  destOrgId: string,
  toCopy: PlannedCopy[],
  answerReverse?: Record<string, boolean>
): Promise<{ destIdBySourceId: Map<string, string>; failed: string[] }> {
  const destIdBySourceId = new Map<string, string>();
  const failed: string[] = [];
  const batchSize = 80;

  for (let i = 0; i < toCopy.length; i += batchSize) {
    const batch = toCopy.slice(i, i + batchSize);
    const payloads = batch.map((p) => {
      const shouldReverse = !!answerReverse?.[p.source.question_id];
      const answer = shouldReverse
        ? reverseScaleAnswer(
            p.source.answer,
            p.match.sourceOptions,
            p.match.destOptions
          )
        : p.source.answer;
      return {
        user_id: p.source.user_id,
        question_id: p.destQuestionId,
        answer,
        role: p.source.role || null,
        dimension: p.match.destDimension || p.source.dimension || null,
        question: p.match.destText || p.source.question || null,
        org_id: destOrgId,
        created_at: p.source.created_at || undefined,
        department: p.source.department || null,
        site: p.source.site || null,
      };
    });

    let inserted:
      | { id: string; user_id: string; question_id: string }[]
      | null = null;
    let errorMessage = "";

    const firstTry = await supabase
      .from("responses")
      .insert(payloads)
      .select("id, user_id, question_id");
    if (firstTry.error && /department|site/i.test(firstTry.error.message)) {
      const slim = payloads.map(
        ({ department: _d, site: _s, ...rest }) => rest
      );
      const retry = await supabase
        .from("responses")
        .insert(slim)
        .select("id, user_id, question_id");
      if (retry.error) errorMessage = retry.error.message;
      else inserted = retry.data;
    } else if (firstTry.error) {
      errorMessage = firstTry.error.message;
    } else {
      inserted = firstTry.data;
    }

    if (errorMessage || !inserted) {
      for (const p of batch) failed.push(`${p.source.id}: ${errorMessage || "insert failed"}`);
      continue;
    }

    const remaining = new Map(
      batch.map((p) => [`${p.source.user_id}::${p.destQuestionId}`, p] as const)
    );
    for (const row of inserted) {
      const planned = remaining.get(`${row.user_id}::${row.question_id}`);
      if (!planned) continue;
      destIdBySourceId.set(planned.source.id, row.id);
      remaining.delete(`${row.user_id}::${row.question_id}`);
    }
    for (const leftover of remaining.values()) {
      failed.push(`${leftover.source.id}: inserted row could not be matched back`);
    }
  }

  return { destIdBySourceId, failed };
}

export async function GET() {
  try {
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = adminClient();
    const migrations = await listMigrations(supabase);
    return NextResponse.json({ migrations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body || {};
    const supabase = adminClient();

    if (action === "list") {
      const migrations = await listMigrations(supabase);
      return NextResponse.json({ migrations });
    }

    if (action === "restore") {
      const migrationId = String(body.migrationId || "");
      if (!migrationId) {
        return NextResponse.json(
          { error: "migrationId is required" },
          { status: 400 }
        );
      }

      const { data: migration, error: migErr } = await supabase
        .from("response_migrations")
        .select("id, status, dest_survey_title")
        .eq("id", migrationId)
        .maybeSingle();
      if (migErr) {
        return NextResponse.json(
          { error: migErr.message + historyTableHint(migErr.message) },
          { status: 500 }
        );
      }
      if (!migration) {
        return NextResponse.json({ error: "Migration not found" }, { status: 404 });
      }
      if (migration.status === "restored") {
        return NextResponse.json({
          ok: true,
          alreadyRestored: true,
          deleted: 0,
        });
      }

      const { data: items, error: itemErr } = await supabase
        .from("response_migration_items")
        .select("dest_response_id")
        .eq("migration_id", migrationId)
        .eq("action", "copied")
        .not("dest_response_id", "is", null);
      if (itemErr) {
        return NextResponse.json({ error: itemErr.message }, { status: 500 });
      }

      const destIds = Array.from(
        new Set(
          (items || [])
            .map((i) => i.dest_response_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let deleted = 0;
      const errors: string[] = [];
      for (let i = 0; i < destIds.length; i += 80) {
        const chunk = destIds.slice(i, i + 80);
        const { error, count } = await supabase
          .from("responses")
          .delete({ count: "exact" })
          .in("id", chunk);
        if (error) errors.push(error.message);
        else deleted += count ?? chunk.length;
      }

      const { error: updErr } = await supabase
        .from("response_migrations")
        .update({
          status: "restored",
          restored_at: new Date().toISOString(),
          restored_by: /^[0-9a-f-]{36}$/i.test(admin.id) ? admin.id : null,
          restored_by_email: admin.email,
        })
        .eq("id", migrationId);
      if (updErr) errors.push(updErr.message);

      return NextResponse.json({
        ok: errors.length === 0,
        deleted,
        errors: errors.slice(0, 10),
      });
    }

    const {
      sourceOrgId,
      destOrgId,
      sourceSurveyId,
      destSurveyId,
      questionOverrides,
      answerReverse,
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
    if (sourceSurveyId === destSurveyId) {
      return NextResponse.json(
        { error: "Source and destination surveys must differ" },
        { status: 400 }
      );
    }

    const prepared = await prepareCompare(supabase, {
      sourceOrgId,
      destOrgId,
      sourceSurveyId,
      destSurveyId,
      questionOverrides: sanitizeOverrides(questionOverrides),
    });

    if (action === "compare") {
      return NextResponse.json(prepared.report);
    }

    if (action !== "execute") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!prepared.report.canMigrate) {
      return NextResponse.json(
        {
          error: "Cannot copy answers",
          details: prepared.report.blockingIssues,
          report: prepared.report,
        },
        { status: 400 }
      );
    }

    const [sourceOrgName, destOrgName] = await Promise.all([
      loadOrgName(supabase, sourceOrgId),
      loadOrgName(supabase, destOrgId),
    ]);

    const { data: migration, error: migInsertErr } = await supabase
      .from("response_migrations")
      .insert({
        created_by: /^[0-9a-f-]{36}$/i.test(admin.id) ? admin.id : null,
        created_by_email: admin.email,
        source_org_id: sourceOrgId,
        dest_org_id: destOrgId,
        source_org_name: sourceOrgName,
        dest_org_name: destOrgName,
        source_survey_id: sourceSurveyId,
        dest_survey_id: destSurveyId,
        source_survey_title: prepared.sourceSurvey.title,
        dest_survey_title: prepared.destSurvey.title,
        status: "running",
        compare_summary: {
          ...prepared.report.summary,
          answerReverse: sanitizeAnswerReverse(answerReverse) || {},
        },
        question_map: prepared.matches,
        notes: "Copy-only. Source responses were not modified.",
      })
      .select("id")
      .single();
    if (migInsertErr || !migration) {
      const message = migInsertErr?.message || "Failed to create migration history";
      return NextResponse.json(
        { error: message + historyTableHint(message) },
        { status: 500 }
      );
    }

    const reverseMap = sanitizeAnswerReverse(answerReverse);
    const { destIdBySourceId, failed } = await copyPlannedRows(
      supabase,
      destOrgId,
      prepared.planned.toCopy,
      reverseMap
    );

    const historyItems: Record<string, unknown>[] = [];
    for (const p of prepared.planned.toCopy) {
      const destId = destIdBySourceId.get(p.source.id) || null;
      const reversed = !!reverseMap?.[p.source.question_id];
      const destAnswer = reversed
        ? reverseScaleAnswer(
            p.source.answer,
            p.match.sourceOptions,
            p.match.destOptions
          )
        : p.source.answer;
      historyItems.push({
        migration_id: migration.id,
        action: destId ? "copied" : "failed",
        source_response_id: p.source.id,
        dest_response_id: destId,
        user_id: p.source.user_id,
        source_question_id: p.source.question_id,
        dest_question_id: p.destQuestionId,
        answer: p.source.answer,
        source_snapshot: {
          ...p.source,
          reversed,
          dest_answer: destAnswer,
        },
      });
    }
    for (const p of [
      ...prepared.planned.skippedConflict,
      ...prepared.planned.skippedDuplicate,
    ]) {
      historyItems.push({
        migration_id: migration.id,
        action: "skipped_conflict",
        source_response_id: p.source.id,
        dest_response_id: null,
        user_id: p.source.user_id,
        source_question_id: p.source.question_id,
        dest_question_id: p.destQuestionId,
        answer: p.source.answer,
        source_snapshot: p.source,
      });
    }
    for (const p of prepared.planned.skippedUnmatched) {
      historyItems.push({
        migration_id: migration.id,
        action: "skipped_unmatched",
        source_response_id: p.source.id,
        dest_response_id: null,
        user_id: p.source.user_id,
        source_question_id: p.source.question_id,
        dest_question_id: p.destQuestionId || null,
        answer: p.source.answer,
        source_snapshot: p.source,
      });
    }

    let historyFailed = 0;
    for (let i = 0; i < historyItems.length; i += 80) {
      const chunk = historyItems.slice(i, i + 80);
      const { error } = await supabase
        .from("response_migration_items")
        .insert(chunk);
      if (error) historyFailed += chunk.length;
    }

    const copied = destIdBySourceId.size;
    const status =
      failed.length === 0 && copied > 0
        ? "completed"
        : copied > 0
          ? "partial"
          : "failed";

    await supabase
      .from("response_migrations")
      .update({
        status,
        copied_count: copied,
        skipped_conflict:
          prepared.planned.skippedConflict.length +
          prepared.planned.skippedDuplicate.length,
        skipped_unmatched: prepared.planned.skippedUnmatched.length,
        failed_count: failed.length,
      })
      .eq("id", migration.id);

    return NextResponse.json({
      ok: status === "completed",
      mode: "copy",
      migrationId: migration.id,
      copied,
      skippedConflict: prepared.planned.skippedConflict.length,
      skippedDuplicate: prepared.planned.skippedDuplicate.length,
      skippedUnmatched: prepared.planned.skippedUnmatched.length,
      failed: failed.length,
      historyWriteFailures: historyFailed,
      errors: failed.slice(0, 20),
      report: prepared.report,
    });
  } catch (error: unknown) {
    console.error("migrate-responses error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
