import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SURVEY_ID = "67813802-0821-4013-8b96-ddc5ba288c60";

const QUESTION_SELECT =
  "question_text, question_type, options, order_index, is_required, dimension, dimension_code, translated_question, scoring_type, max_score, min_score, reverse_score, translated_options, template_id";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "survey"
  );
}

export function cloneTitle(sourceTitle: string) {
  const base = (sourceTitle || "Survey").trim();
  if (/\(copy\)\s*$/i.test(base)) return base;
  return `${base} (copy)`;
}

export async function cloneSurvey(args: {
  supabase: SupabaseClient;
  sourceSurveyId: string;
  destOrgId: string;
  title?: string | null;
  createdBy?: string | null;
}): Promise<{
  surveyId: string;
  title: string;
  questionCount: number;
  slug: string;
}> {
  const { data: source, error: sourceErr } = await args.supabase
    .from("surveys")
    .select("id, title, description, target_company, org_id")
    .eq("id", args.sourceSurveyId)
    .maybeSingle();

  if (sourceErr) throw new Error(sourceErr.message);
  if (!source) throw new Error("Source survey not found");

  const { data: questions, error: qErr } = await args.supabase
    .from("survey_questions")
    .select(QUESTION_SELECT)
    .eq("survey_id", args.sourceSurveyId)
    .order("order_index", { ascending: true });

  if (qErr) throw new Error(qErr.message);

  const title = (args.title || "").trim() || cloneTitle(source.title || "Survey");
  const slug = `${slugify(title)}-copy-${Date.now().toString(36).slice(-6)}`;

  const basePayload: Record<string, unknown> = {
    title,
    description: source.description || null,
    created_by: args.createdBy || null,
    slug,
    is_published: false,
    org_id: args.destOrgId,
    target_company: source.target_company || null,
  };

  const insertSurvey = async (payload: Record<string, unknown>) =>
    args.supabase.from("surveys").insert(payload).select("id, title, slug").single();

  let { data: created, error: insertErr } = await insertSurvey(basePayload);

  if (insertErr && /created_by/i.test(insertErr.message)) {
    ({ data: created, error: insertErr } = await insertSurvey({
      ...basePayload,
      created_by: null,
    }));
  }
  if (insertErr && /target_company/i.test(insertErr.message)) {
    const { target_company: _omit, ...withoutCompany } = basePayload;
    ({ data: created, error: insertErr } = await insertSurvey({
      ...withoutCompany,
      created_by: args.createdBy || null,
    }));
    if (insertErr && /created_by/i.test(insertErr.message)) {
      ({ data: created, error: insertErr } = await insertSurvey({
        ...withoutCompany,
        created_by: null,
      }));
    }
  }

  if (insertErr || !created) {
    throw new Error(insertErr?.message || "Failed to create cloned survey");
  }

  const rows = (questions || []).map((q, i) => ({
    survey_id: created.id,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options ?? null,
    order_index: q.order_index ?? i,
    is_required: !!q.is_required,
    dimension: q.dimension || null,
    dimension_code: q.dimension_code || null,
    translated_question: q.translated_question || null,
    scoring_type: q.scoring_type || null,
    max_score: q.max_score ?? null,
    min_score: q.min_score ?? null,
    reverse_score: !!q.reverse_score || (q.scoring_type || "").toLowerCase() === "negative",
    translated_options: q.translated_options ?? null,
    template_id: q.template_id || null,
  }));

  if (rows.length) {
    const batchSize = 80;
    for (let i = 0; i < rows.length; i += batchSize) {
      const { error: rowErr } = await args.supabase
        .from("survey_questions")
        .insert(rows.slice(i, i + batchSize));
      if (rowErr) {
        await args.supabase.from("surveys").delete().eq("id", created.id);
        throw new Error(rowErr.message);
      }
    }
  }

  return {
    surveyId: created.id,
    title: created.title,
    questionCount: rows.length,
    slug: created.slug,
  };
}
