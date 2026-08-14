export function dimensionKey(q: {
  dimension?: string | null;
  dimension_code?: string | null;
}): string {
  return (q.dimension || q.dimension_code || "General").trim() || "General";
}

export function numericScoreForAnswer(
  q: {
    template_id?: string | null;
    options?: string[] | null;
    min_score?: number | null;
    max_score?: number | null;
    scoring_type?: string | null;
    question_type?: string | null;
    reverse_score?: boolean | null;
  },
  answer: string | null | undefined,
  templateMap: Record<string, { options?: string[]; scores?: number[] }>
): number | null {
  if (q.scoring_type === "text" || q.question_type === "text") return null;
  const raw = answer?.trim() ?? "";
  if (!raw) return null;

  const template = q.template_id ? templateMap[q.template_id] : null;
  const options: string[] = template?.options?.length
    ? template.options
    : Array.isArray(q.options)
      ? q.options
      : [];
  const mappedScores = template?.scores;

  if (options.length) {
    const optionIndex = options.findIndex(
      (opt) => opt?.trim().toLowerCase() === raw.toLowerCase()
    );
    if (optionIndex !== -1) {
      let score: number;
      if (
        mappedScores &&
        mappedScores[optionIndex] != null &&
        !Number.isNaN(Number(mappedScores[optionIndex]))
      ) {
        score = Number(mappedScores[optionIndex]);
      } else {
        const min = Number(q.min_score ?? 1);
        const max = Number(q.max_score ?? Math.max(options.length, 1));
        score =
          options.length === 1
            ? min
            : min + (optionIndex / (options.length - 1)) * (max - min);
      }
      if (q.reverse_score || q.scoring_type === "negative") {
        score = (q.max_score ?? 5) + 1 - score;
      }
      return score;
    }
  }

  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return null;
  let score = parsed;
  if (q.reverse_score || q.scoring_type === "negative") {
    score = (q.max_score ?? 5) + 1 - score;
  }
  return score;
}
