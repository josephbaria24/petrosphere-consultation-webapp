import type { SupabaseClient } from "@supabase/supabase-js";
import {
  matchSurveyQuestions,
  applyQuestionOverrides,
  type QuestionMatch,
  type SurveyQuestionRow,
} from "../migrate-survey-responses";
import {
  RESPONSE_EXPORT_COLUMNS,
  type ExportSheet,
} from "../migrate-response-export";

export type ResponseRow = {
  id: string;
  user_id: string;
  question_id: string;
  answer: string | null;
  role?: string | null;
  dimension?: string | null;
  question?: string | null;
  org_id?: string | null;
  created_at?: string | null;
  department?: string | null;
  site?: string | null;
};

export type UserExportRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  site?: string | null;
};

const PAGE = 1000;
const IN_CHUNK = 80;

async function pagedSelect<T>(
  run: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

export async function loadResponsesForQuestions(
  supabase: SupabaseClient,
  orgId: string,
  questionIds: string[],
  extraColumns = true
): Promise<ResponseRow[]> {
  if (!questionIds.length) return [];
  const selectWithDept =
    "id, user_id, question_id, answer, role, dimension, question, org_id, created_at, department, site";
  const selectBase =
    "id, user_id, question_id, answer, role, dimension, question, org_id, created_at";
  const select = extraColumns ? selectWithDept : selectBase;
  const rows: ResponseRow[] = [];

  for (let i = 0; i < questionIds.length; i += IN_CHUNK) {
    const chunk = questionIds.slice(i, i + IN_CHUNK);
    try {
      const part = await pagedSelect<ResponseRow>((from, to) =>
        supabase
          .from("responses")
          .select(select)
          .eq("org_id", orgId)
          .in("question_id", chunk)
          .range(from, to)
      );
      rows.push(...part);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (extraColumns && /department|site/i.test(message)) {
        return loadResponsesForQuestions(supabase, orgId, questionIds, false);
      }
      throw err;
    }
  }
  return rows;
}

export async function loadDestCollisionKeys(
  supabase: SupabaseClient,
  destOrgId: string,
  destQuestionIds: string[]
): Promise<Set<string>> {
  const keys = new Set<string>();
  if (!destQuestionIds.length) return keys;
  for (let i = 0; i < destQuestionIds.length; i += IN_CHUNK) {
    const chunk = destQuestionIds.slice(i, i + IN_CHUNK);
    const part = await pagedSelect<{ user_id: string; question_id: string }>(
      (from, to) =>
        supabase
          .from("responses")
          .select("user_id, question_id")
          .eq("org_id", destOrgId)
          .in("question_id", chunk)
          .range(from, to)
    );
    for (const r of part) keys.add(`${r.user_id}::${r.question_id}`);
  }
  return keys;
}

export async function loadUsersById(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, UserExportRow>> {
  const map: Record<string, UserExportRow> = {};
  if (!userIds.length) return map;
  for (let i = 0; i < userIds.length; i += IN_CHUNK) {
    const chunk = userIds.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, role, department, site")
      .in("id", chunk);
    if (error) throw error;
    for (const u of data || []) map[u.id] = u as UserExportRow;
  }
  return map;
}

export async function loadOrgName(
  supabase: SupabaseClient,
  orgId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  return data?.name || null;
}

export type PlannedCopy = {
  source: ResponseRow;
  match: QuestionMatch;
  destQuestionId: string;
  status: "copied" | "skipped_conflict" | "skipped_unmatched";
  skipReason?: "dest_exists" | "source_duplicate";
};

export function planCopies(args: {
  sourceResponses: ResponseRow[];
  matches: QuestionMatch[];
  destCollisionKeys: Set<string>;
}): {
  toCopy: PlannedCopy[];
  skippedConflict: PlannedCopy[];
  skippedDuplicate: PlannedCopy[];
  skippedUnmatched: PlannedCopy[];
} {
  const mapBySource = new Map(
    args.matches
      .filter((m) => m.destQuestionId)
      .map((m) => [m.sourceQuestionId, m] as const)
  );
  const toCopy: PlannedCopy[] = [];
  const skippedConflict: PlannedCopy[] = [];
  const skippedDuplicate: PlannedCopy[] = [];
  const skippedUnmatched: PlannedCopy[] = [];
  const usedDestKeys = new Set(args.destCollisionKeys);

  for (const source of args.sourceResponses) {
    const match = mapBySource.get(source.question_id);
    if (!match?.destQuestionId) {
      skippedUnmatched.push({
        source,
        match: match || {
          sourceQuestionId: source.question_id,
          sourceText: source.question || "",
          sourceDimension: source.dimension || null,
          sourceDimensionCode: null,
          sourceType: null,
          sourceOrder: null,
          sourceOptions: null,
          sourceReverseScore: false,
          sourceScoringType: null,
          destQuestionId: null,
          destText: null,
          destDimension: null,
          destDimensionCode: null,
          destType: null,
          destOrder: null,
          destOptions: null,
          destReverseScore: false,
          destScoringType: null,
          status: "unmatched",
          warnings: ["No matching question on destination survey"],
        },
        destQuestionId: "",
        status: "skipped_unmatched",
      });
      continue;
    }
    const key = `${source.user_id}::${match.destQuestionId}`;
    if (args.destCollisionKeys.has(key)) {
      skippedConflict.push({
        source,
        match,
        destQuestionId: match.destQuestionId,
        status: "skipped_conflict",
        skipReason: "dest_exists",
      });
      continue;
    }
    if (usedDestKeys.has(key)) {
      skippedDuplicate.push({
        source,
        match,
        destQuestionId: match.destQuestionId,
        status: "skipped_conflict",
        skipReason: "source_duplicate",
      });
      continue;
    }
    usedDestKeys.add(key);
    toCopy.push({
      source,
      match,
      destQuestionId: match.destQuestionId,
      status: "copied",
    });
  }

  return { toCopy, skippedConflict, skippedDuplicate, skippedUnmatched };
}

function respondentName(user?: UserExportRow | null): string {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return name || user?.email || "";
}

function questionMeta(
  questions: SurveyQuestionRow[],
  questionId: string | null | undefined
) {
  const q = questions.find((row) => row.id === questionId);
  return {
    order: q?.order_index != null ? q.order_index + 1 : "",
    dimension: q?.dimension || "",
    dimension_code: q?.dimension_code || "",
    question: q?.question_text || "",
  };
}

export function plannedRowForExport(
  planned: PlannedCopy,
  users: Record<string, UserExportRow>,
  sourceQuestions: SurveyQuestionRow[],
  destQuestions: SurveyQuestionRow[],
  destResponseId?: string | null
): Record<string, unknown> {
  const user = users[planned.source.user_id];
  const srcMeta = questionMeta(sourceQuestions, planned.source.question_id);
  const destMeta = planned.destQuestionId
    ? questionMeta(destQuestions, planned.destQuestionId)
    : srcMeta;
  const meta = planned.status === "copied" ? destMeta : srcMeta;
  return {
    respondent_name: respondentName(user),
    email: user?.email || "",
    role: planned.source.role || user?.role || "",
    department: planned.source.department || user?.department || "",
    site: planned.source.site || user?.site || "",
    user_id: planned.source.user_id,
    question_order: meta.order,
    dimension: planned.match.destDimension || planned.source.dimension || meta.dimension,
    dimension_code:
      planned.match.destDimensionCode ||
      planned.match.sourceDimensionCode ||
      meta.dimension_code,
    question:
      planned.status === "copied"
        ? planned.match.destText || meta.question
        : planned.source.question || srcMeta.question,
    answer: planned.source.answer || "",
    created_at: planned.source.created_at || "",
    source_response_id: planned.source.id,
    dest_response_id: destResponseId || "",
    status: planned.status,
  };
}

export function sourceBackupSheets(args: {
  sourceOrgName: string;
  destOrgName: string;
  sourceSurveyTitle: string;
  destSurveyTitle: string;
  matches: QuestionMatch[];
  sourceResponses: ResponseRow[];
  sourceQuestions: SurveyQuestionRow[];
  destQuestions: SurveyQuestionRow[];
  users: Record<string, UserExportRow>;
  toCopy: PlannedCopy[];
  skippedConflict: PlannedCopy[];
  skippedDuplicate?: PlannedCopy[];
  skippedUnmatched: PlannedCopy[];
}): ExportSheet[] {
  const {
    matches,
    sourceResponses,
    sourceQuestions,
    destQuestions,
    users,
    toCopy,
    skippedConflict,
    skippedDuplicate = [],
    skippedUnmatched,
  } = args;

  return [
    {
      name: "Summary",
      columns: [
        { header: "Field", key: "field", width: 28 },
        { header: "Value", key: "value", width: 64 },
      ],
      rows: [
        { field: "Source org", value: args.sourceOrgName },
        { field: "Source survey", value: args.sourceSurveyTitle },
        { field: "Destination org", value: args.destOrgName },
        { field: "Destination survey", value: args.destSurveyTitle },
        { field: "Mode", value: "Copy — source responses stay untouched" },
        { field: "Source answer rows", value: sourceResponses.length },
        { field: "Will copy", value: toCopy.length },
        { field: "Skip (already on dest)", value: skippedConflict.length },
        { field: "Skip (duplicate source row)", value: skippedDuplicate.length },
        { field: "Skip (unmatched question)", value: skippedUnmatched.length },
        { field: "Exported at", value: new Date().toISOString() },
      ],
    },
    {
      name: "Question mapping",
      columns: [
        { header: "Status", key: "status", width: 12 },
        { header: "Source order", key: "source_order", width: 14 },
        { header: "Source code", key: "source_code", width: 14 },
        { header: "Source question", key: "source_text", width: 50 },
        { header: "Dest order", key: "dest_order", width: 12 },
        { header: "Dest code", key: "dest_code", width: 12 },
        { header: "Dest question", key: "dest_text", width: 50 },
        { header: "Warnings", key: "warnings", width: 36 },
      ],
      rows: matches.map((m) => ({
        status: m.status,
        source_order: m.sourceOrder != null ? m.sourceOrder + 1 : "",
        source_code: m.sourceDimensionCode || "",
        source_text: m.sourceText,
        dest_order: m.destOrder != null ? m.destOrder + 1 : "",
        dest_code: m.destDimensionCode || "",
        dest_text: m.destText || "",
        warnings: (m.warnings || []).join("; "),
      })),
    },
    {
      name: "Source answers (backup)",
      columns: RESPONSE_EXPORT_COLUMNS.filter(
        (c) => c.key !== "dest_response_id" && c.key !== "status"
      ),
      rows: sourceResponses.map((r) => {
        const user = users[r.user_id];
        const meta = questionMeta(sourceQuestions, r.question_id);
        return {
          respondent_name: respondentName(user),
          email: user?.email || "",
          role: r.role || user?.role || "",
          department: r.department || user?.department || "",
          site: r.site || user?.site || "",
          user_id: r.user_id,
          question_order: meta.order,
          dimension: r.dimension || meta.dimension,
          dimension_code: meta.dimension_code,
          question: r.question || meta.question,
          answer: r.answer || "",
          created_at: r.created_at || "",
          source_response_id: r.id,
        };
      }),
    },
    {
      name: "Will copy",
      columns: RESPONSE_EXPORT_COLUMNS,
      rows: toCopy.map((p) =>
        plannedRowForExport(p, users, sourceQuestions, destQuestions)
      ),
    },
    {
      name: "Skipped conflicts",
      columns: RESPONSE_EXPORT_COLUMNS,
      rows: skippedConflict.map((p) =>
        plannedRowForExport(p, users, sourceQuestions, destQuestions)
      ),
    },
    {
      name: "Skipped duplicate source",
      columns: RESPONSE_EXPORT_COLUMNS,
      rows: skippedDuplicate.map((p) =>
        plannedRowForExport(p, users, sourceQuestions, destQuestions)
      ),
    },
    {
      name: "Unmatched (not copied)",
      columns: RESPONSE_EXPORT_COLUMNS,
      rows: skippedUnmatched.map((p) =>
        plannedRowForExport(p, users, sourceQuestions, destQuestions)
      ),
    },
  ];
}

export type MigrationRecord = {
  id: string;
  created_at: string;
  created_by_email: string | null;
  source_org_id: string | null;
  dest_org_id: string | null;
  source_org_name: string | null;
  dest_org_name: string | null;
  source_survey_id: string | null;
  dest_survey_id: string | null;
  source_survey_title: string | null;
  dest_survey_title: string | null;
  status: string;
  copied_count: number;
  skipped_conflict: number;
  skipped_unmatched: number;
  failed_count: number;
  restored_at: string | null;
  restored_by_email: string | null;
};

export type MigrationItem = {
  id: string;
  migration_id: string;
  action: string;
  source_response_id: string | null;
  dest_response_id: string | null;
  user_id: string | null;
  source_question_id: string | null;
  dest_question_id: string | null;
  answer: string | null;
  source_snapshot: ResponseRow | Record<string, unknown>;
};

export async function loadSurveyQuestions(
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

export async function loadSurveyMeta(
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

export async function prepareCopyPlan(
  supabase: SupabaseClient,
  args: {
    sourceOrgId: string;
    destOrgId: string;
    sourceSurveyId: string;
    destSurveyId: string;
    questionOverrides?: Record<string, string> | null;
  }
) {
  const [sourceSurvey, destSurvey] = await Promise.all([
    loadSurveyMeta(supabase, args.sourceSurveyId),
    loadSurveyMeta(supabase, args.destSurveyId),
  ]);
  if (!sourceSurvey || !destSurvey) {
    throw Object.assign(new Error("Source or destination survey not found"), {
      status: 404,
    });
  }

  const [sourceQuestions, destQuestions] = await Promise.all([
    loadSurveyQuestions(supabase, args.sourceSurveyId),
    loadSurveyQuestions(supabase, args.destSurveyId),
  ]);
  const autoMatches = matchSurveyQuestions(sourceQuestions, destQuestions);
  const matches = applyQuestionOverrides(
    autoMatches,
    destQuestions,
    args.questionOverrides
  );
  const sourceResponses = await loadResponsesForQuestions(
    supabase,
    args.sourceOrgId,
    sourceQuestions.map((q) => q.id)
  );
  const destCollisionKeys = await loadDestCollisionKeys(
    supabase,
    args.destOrgId,
    destQuestions.map((q) => q.id)
  );
  const planned = planCopies({ sourceResponses, matches, destCollisionKeys });

  return {
    sourceSurvey,
    destSurvey,
    sourceQuestions,
    destQuestions,
    matches,
    sourceResponses,
    destCollisionKeys,
    planned,
  };
}
