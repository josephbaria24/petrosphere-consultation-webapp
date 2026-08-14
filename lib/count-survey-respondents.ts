/**
 * Count unique respondents per survey via question_id.
 * `responses` rows are stored per question, not per survey_id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const QUESTION_CHUNK = 150;
const PAGE_SIZE = 1000;

export async function countRespondentsBySurvey(options: {
  supabase: SupabaseClient;
  questionToSurvey: Map<string, string>;
  orgId?: string | null;
}): Promise<Record<string, number>> {
  const { supabase, questionToSurvey, orgId } = options;
  const questionIds = Array.from(questionToSurvey.keys());
  const usersBySurvey = new Map<string, Set<string>>();

  if (questionIds.length === 0) return {};

  for (let i = 0; i < questionIds.length; i += QUESTION_CHUNK) {
    const chunk = questionIds.slice(i, i + QUESTION_CHUNK);
    let from = 0;

    while (true) {
      let query = supabase
        .from("responses")
        .select("user_id, question_id")
        .in("question_id", chunk)
        .range(from, from + PAGE_SIZE - 1);

      if (orgId && orgId !== "all") {
        query = query.eq("org_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      for (const row of rows) {
        if (!row.question_id) continue;
        const surveyId = questionToSurvey.get(row.question_id);
        if (!surveyId) continue;
        const respondentKey = row.user_id || "anonymous";
        if (!usersBySurvey.has(surveyId)) {
          usersBySurvey.set(surveyId, new Set());
        }
        usersBySurvey.get(surveyId)!.add(respondentKey);
      }

      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  const counts: Record<string, number> = {};
  for (const [surveyId, users] of usersBySurvey) {
    counts[surveyId] = users.size;
  }
  return counts;
}

export function questionMapFromSurveys(
  surveys: { id: string; survey_questions?: { id: string }[] | null }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const survey of surveys) {
    for (const question of survey.survey_questions || []) {
      if (question?.id) map.set(question.id, survey.id);
    }
  }
  return map;
}
