/**
 * Compare / match helpers for migrating survey responses between orgs.
 */

export type SurveyQuestionRow = {
  id: string;
  survey_id: string;
  question_text: string;
  question_type?: string | null;
  options?: string[] | null;
  order_index?: number | null;
  dimension?: string | null;
  dimension_code?: string | null;
  scoring_type?: string | null;
  max_score?: number | null;
  min_score?: number | null;
  reverse_score?: boolean | null;
};

export type MatchStatus = "exact" | "strong" | "weak" | "unmatched";

export type QuestionMatch = {
  sourceQuestionId: string;
  sourceText: string;
  sourceDimension: string | null;
  sourceDimensionCode: string | null;
  sourceType: string | null;
  sourceOrder: number | null;
  destQuestionId: string | null;
  destText: string | null;
  destDimension: string | null;
  destDimensionCode: string | null;
  destType: string | null;
  destOrder: number | null;
  status: MatchStatus;
  warnings: string[];
};

export function normalizeQuestionText(text: string | null | undefined): string {
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function optionsKey(options: string[] | null | undefined): string {
  if (!options?.length) return "";
  return options.map((o) => o.trim().toLowerCase()).join("|");
}

function scorePair(
  source: SurveyQuestionRow,
  dest: SurveyQuestionRow
): { score: number; status: MatchStatus; warnings: string[] } {
  const warnings: string[] = [];
  const srcText = normalizeQuestionText(source.question_text);
  const destText = normalizeQuestionText(dest.question_text);
  const textMatch = srcText.length > 0 && srcText === destText;
  const codeMatch =
    !!source.dimension_code?.trim() &&
    source.dimension_code.trim().toLowerCase() ===
      (dest.dimension_code || "").trim().toLowerCase();
  const typeMatch =
    (source.question_type || "").toLowerCase() ===
    (dest.question_type || "").toLowerCase();
  const orderMatch =
    source.order_index != null &&
    dest.order_index != null &&
    source.order_index === dest.order_index;
  const optionsMatch =
    optionsKey(source.options) === optionsKey(dest.options);

  if (!typeMatch && (textMatch || orderMatch)) {
    warnings.push("Question type differs");
  }
  if (textMatch && !optionsMatch && (source.options?.length || dest.options?.length)) {
    warnings.push("Answer options differ");
  }
  if (
    (source.scoring_type || "") !== (dest.scoring_type || "") &&
    (textMatch || codeMatch)
  ) {
    warnings.push("Scoring type differs");
  }
  if (
    !!source.dimension_code?.trim() &&
    !!dest.dimension_code?.trim() &&
    !codeMatch &&
    textMatch
  ) {
    warnings.push("Dimension code differs");
  }

  if (textMatch && codeMatch && typeMatch) {
    return { score: 100, status: "exact", warnings };
  }
  if (textMatch && typeMatch) {
    return { score: 90, status: "strong", warnings };
  }
  if (codeMatch && orderMatch && typeMatch) {
    return { score: 80, status: "strong", warnings };
  }
  if (textMatch) {
    return { score: 70, status: "strong", warnings };
  }
  if (orderMatch && typeMatch && codeMatch) {
    return { score: 60, status: "weak", warnings };
  }
  if (orderMatch && typeMatch) {
    return { score: 40, status: "weak", warnings };
  }
  return { score: 0, status: "unmatched", warnings };
}

/** Greedy 1:1 matching of source questions onto destination questions. */
export function matchSurveyQuestions(
  sourceQuestions: SurveyQuestionRow[],
  destQuestions: SurveyQuestionRow[]
): QuestionMatch[] {
  const sourceSorted = [...sourceQuestions].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const destSorted = [...destQuestions].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  type Candidate = {
    sourceId: string;
    destId: string;
    score: number;
    status: MatchStatus;
    warnings: string[];
  };

  const candidates: Candidate[] = [];
  for (const src of sourceSorted) {
    for (const dest of destSorted) {
      const { score, status, warnings } = scorePair(src, dest);
      if (score > 0) {
        candidates.push({
          sourceId: src.id,
          destId: dest.id,
          score,
          status,
          warnings,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const usedSource = new Set<string>();
  const usedDest = new Set<string>();
  const assigned = new Map<string, Candidate>();

  for (const c of candidates) {
    if (usedSource.has(c.sourceId) || usedDest.has(c.destId)) continue;
    usedSource.add(c.sourceId);
    usedDest.add(c.destId);
    assigned.set(c.sourceId, c);
  }

  const destById = Object.fromEntries(destSorted.map((q) => [q.id, q]));

  return sourceSorted.map((src) => {
    const hit = assigned.get(src.id);
    if (!hit) {
      return {
        sourceQuestionId: src.id,
        sourceText: src.question_text,
        sourceDimension: src.dimension || null,
        sourceDimensionCode: src.dimension_code || null,
        sourceType: src.question_type || null,
        sourceOrder: src.order_index ?? null,
        destQuestionId: null,
        destText: null,
        destDimension: null,
        destDimensionCode: null,
        destType: null,
        destOrder: null,
        status: "unmatched" as const,
        warnings: ["No matching question on destination survey"],
      };
    }
    const dest = destById[hit.destId];
    return {
      sourceQuestionId: src.id,
      sourceText: src.question_text,
      sourceDimension: src.dimension || null,
      sourceDimensionCode: src.dimension_code || null,
      sourceType: src.question_type || null,
      sourceOrder: src.order_index ?? null,
      destQuestionId: dest.id,
      destText: dest.question_text,
      destDimension: dest.dimension || null,
      destDimensionCode: dest.dimension_code || null,
      destType: dest.question_type || null,
      destOrder: dest.order_index ?? null,
      status: hit.status,
      warnings: hit.warnings,
    };
  });
}

export function collectDimensionCodes(
  questions: SurveyQuestionRow[]
): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    const code = (q.dimension_code || "").trim();
    if (code) set.add(code);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
