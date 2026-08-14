"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "../@/components/ui/badge";
import { Loader2 } from "@/components/icons";
import { barColorForScoreClass } from "./dashboard/dimension-bar-utils";
import { dimensionKey, numericScoreForAnswer } from "../lib/survey-score";

export type DimensionRespondentRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  avgScore: number;
  avgPercent: number;
  answers: {
    questionId: string;
    question: string;
    answer: string;
    score: number | null;
  }[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: string | null;
  surveyId: string | null;
  orgId?: string | null;
  isPlatformAdmin?: boolean;
};

function scoreAnswer(
  answer: string,
  q: {
    template_id?: string | null;
    options?: string[] | null;
    scoring_type?: string | null;
    question_type?: string | null;
    reverse_score?: boolean | null;
    max_score?: number | null;
    min_score?: number | null;
  },
  templateMap: Record<string, { options: string[]; scores: number[] }>
): number | null {
  return numericScoreForAnswer(q, answer, templateMap);
}

export function DimensionRespondentsDialog({
  open,
  onOpenChange,
  dimension,
  surveyId,
  orgId,
  isPlatformAdmin = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DimensionRespondentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !dimension || !surveyId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setRows([]);
      try {
        const { data: allQuestions, error: qErr } = await supabase
          .from("survey_questions")
          .select(
            "id, question_text, dimension, dimension_code, template_id, scoring_type, question_type, reverse_score, max_score, min_score, options"
          )
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });

        if (qErr) throw qErr;
        const questions = (allQuestions || []).filter(
          (q) => q.dimension === dimension || dimensionKey(q) === dimension
        );

        if (qErr) throw qErr;
        if (!questions?.length) {
          if (!cancelled) setRows([]);
          return;
        }

        const questionIds = questions.map((q) => q.id);
        let responses: {
          user_id: string;
          question_id: string;
          answer: string;
          role?: string;
        }[] = [];

        if (isPlatformAdmin) {
          const resp = await fetch("/api/admin/all-responses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionIds,
              orgId: orgId && orgId !== "all" ? orgId : undefined,
            }),
          });
          if (!resp.ok) throw new Error("Failed to load responses");
          responses = await resp.json();
        } else {
          let query = supabase
            .from("responses")
            .select("user_id, question_id, answer, role")
            .in("question_id", questionIds);
          if (orgId) query = query.eq("org_id", orgId);
          const { data, error: rErr } = await query;
          if (rErr) throw rErr;
          responses = data || [];
        }

        const templateIds = Array.from(
          new Set(
            questions.map((q) => q.template_id).filter(Boolean) as string[]
          )
        );
        const templateMap: Record<
          string,
          { options: string[]; scores: number[] }
        > = {};
        if (templateIds.length) {
          const { data: templates } = await supabase
            .from("option_templates")
            .select("id, options, scores")
            .in("id", templateIds);
          (templates || []).forEach((t) => {
            templateMap[t.id] = { options: t.options || [], scores: t.scores || [] };
          });
        }

        const userIds = Array.from(
          new Set(responses.map((r) => r.user_id).filter(Boolean))
        );
        const userMap: Record<
          string,
          { first_name?: string; last_name?: string; email?: string; role?: string }
        > = {};
        if (userIds.length) {
          const { data: users } = await supabase
            .from("users")
            .select("id, first_name, last_name, email, role")
            .in("id", userIds);
          (users || []).forEach((u) => {
            userMap[u.id] = u;
          });
        }

        const byUser = new Map<
          string,
          {
            scores: number[];
            answers: DimensionRespondentRow["answers"];
            role: string;
          }
        >();

        for (const r of responses) {
          const q = questions.find((qu) => qu.id === r.question_id);
          if (!q) continue;
          const score = scoreAnswer(r.answer, q, templateMap);
          if (!byUser.has(r.user_id)) {
            byUser.set(r.user_id, {
              scores: [],
              answers: [],
              role: r.role || userMap[r.user_id]?.role || "—",
            });
          }
          const bucket = byUser.get(r.user_id)!;
          if (score != null) bucket.scores.push(score);
          bucket.answers.push({
            questionId: q.id,
            question: q.question_text,
            answer: r.answer,
            score,
          });
        }

        const next: DimensionRespondentRow[] = Array.from(byUser.entries()).map(
          ([userId, bucket]) => {
            const u = userMap[userId];
            const avgScore = bucket.scores.length
              ? bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length
              : 0;
            return {
              userId,
              name: u
                ? `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                  u.email ||
                  "Unknown"
                : "Unknown",
              email: u?.email || "—",
              role: bucket.role,
              avgScore,
              avgPercent: (avgScore / 5) * 100,
              answers: bucket.answers,
            };
          }
        );

        next.sort((a, b) => a.avgPercent - b.avgPercent);
        if (!cancelled) setRows(next);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load respondents"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, dimension, surveyId, orgId, isPlatformAdmin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="pr-8 leading-snug">
            {dimension || "Dimension"}
          </DialogTitle>
          <DialogDescription>
            Respondents, answers, and scores for this dimension
            {rows.length > 0 ? ` · ${rows.length} people` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading respondents…
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No responses for this dimension yet.
            </p>
          )}
          {!loading &&
            rows.map((row) => (
              <div
                key={row.userId}
                className="rounded-lg border bg-card p-3 space-y-2 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{row.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {row.role}
                    </Badge>
                    <Badge
                      className={`text-[10px] border-0 text-foreground ${barColorForScoreClass(row.avgPercent)}`}
                    >
                      {row.avgPercent.toFixed(1)}% · {row.avgScore.toFixed(2)}/5
                    </Badge>
                  </div>
                </div>
                <ul className="space-y-2 border-t pt-2">
                  {row.answers.map((a, answerIdx) => (
                    <li
                      key={`${row.userId}-${a.questionId}-${answerIdx}`}
                      className="text-xs space-y-0.5"
                    >
                      <p className="font-medium text-foreground/90 leading-snug">
                        {a.question}
                      </p>
                      <p className="text-muted-foreground">
                        Answer:{" "}
                        <span className="text-foreground">{a.answer || "—"}</span>
                        {a.score != null && (
                          <span className="ml-2 tabular-nums text-foreground/80">
                            · score {a.score.toFixed(1)}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
