import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SURVEY_ID } from "./clone-survey";

const CHUNK = 80;

export { DEFAULT_SURVEY_ID };

async function deleteInChunks(
  supabase: SupabaseClient,
  table: string,
  column: string,
  ids: string[]
) {
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) throw new Error(error.message);
  }
}

export async function deleteSurveyAndRelated(
  supabase: SupabaseClient,
  surveyId: string
): Promise<{ deletedQuestions: number; deletedResponses: boolean }> {
  if (surveyId === DEFAULT_SURVEY_ID) {
    throw new Error("The default Safety Vitals survey cannot be deleted");
  }

  const { data: questions, error: qErr } = await supabase
    .from("survey_questions")
    .select("id")
    .eq("survey_id", surveyId);
  if (qErr) throw new Error(qErr.message);

  const questionIds = (questions || []).map((q) => q.id).filter(Boolean);

  if (questionIds.length) {
    await deleteInChunks(supabase, "responses", "question_id", questionIds);
  }

  const { error: actionsErr } = await supabase
    .from("actions")
    .delete()
    .eq("survey_id", surveyId);
  if (actionsErr && !/does not exist|schema cache/i.test(actionsErr.message)) {
    throw new Error(actionsErr.message);
  }

  const { error: insightsErr } = await supabase
    .from("survey_ai_insights")
    .delete()
    .eq("survey_id", surveyId);
  if (insightsErr && !/does not exist|schema cache/i.test(insightsErr.message)) {
    throw new Error(insightsErr.message);
  }

  const { error: questionsErr } = await supabase
    .from("survey_questions")
    .delete()
    .eq("survey_id", surveyId);
  if (questionsErr) throw new Error(questionsErr.message);

  const { error: surveyErr } = await supabase
    .from("surveys")
    .delete()
    .eq("id", surveyId);
  if (surveyErr) throw new Error(surveyErr.message);

  return {
    deletedQuestions: questionIds.length,
    deletedResponses: questionIds.length > 0,
  };
}
