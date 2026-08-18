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

export type MatchStatus = "exact" | "strong" | "weak" | "unmatched" | "manual";

export type QuestionMatch = {
  sourceQuestionId: string;
  sourceText: string;
  sourceDimension: string | null;
  sourceDimensionCode: string | null;
  sourceType: string | null;
  sourceOrder: number | null;
  sourceOptions: string[] | null;
  sourceReverseScore: boolean;
  sourceScoringType: string | null;
  destQuestionId: string | null;
  destText: string | null;
  destDimension: string | null;
  destDimensionCode: string | null;
  destType: string | null;
  destOrder: number | null;
  destOptions: string[] | null;
  destReverseScore: boolean;
  destScoringType: string | null;
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

function isNegativeScoring(q: {
  reverse_score?: boolean | null;
  scoring_type?: string | null;
}): boolean {
  return (
    !!q.reverse_score || (q.scoring_type || "").toLowerCase() === "negative"
  );
}

function optionList(options: string[] | null | undefined): string[] | null {
  if (!options?.length) return null;
  return options.map((o) => String(o));
}

function sourceScoring(src: SurveyQuestionRow) {
  return {
    sourceOptions: optionList(src.options),
    sourceReverseScore: isNegativeScoring(src),
    sourceScoringType: src.scoring_type || null,
  };
}

function destScoring(dest: SurveyQuestionRow | null) {
  if (!dest) {
    return {
      destOptions: null as string[] | null,
      destReverseScore: false,
      destScoringType: null as string | null,
    };
  }
  return {
    destOptions: optionList(dest.options),
    destReverseScore: isNegativeScoring(dest),
    destScoringType: dest.scoring_type || null,
  };
}

/** Flip a likert/scale answer to the opposite option. */
export function reverseScaleAnswer(
  answer: string | null | undefined,
  sourceOptions?: string[] | null,
  destOptions?: string[] | null
): string | null {
  if (answer == null) return null;
  const raw = answer.trim();
  if (!raw) return answer;
  const src = (sourceOptions || []).map((o) => o.trim()).filter(Boolean);
  const dest = (destOptions || []).map((o) => o.trim()).filter(Boolean);
  const scale = src.length ? src : dest;
  if (scale.length > 1) {
    const idx = scale.findIndex((o) => o.toLowerCase() === raw.toLowerCase());
    if (idx !== -1) {
      const flipped = scale.length - 1 - idx;
      if (dest.length === scale.length) return dest[flipped];
      return scale[flipped];
    }
  }
  const n = parseFloat(raw);
  if (!Number.isNaN(n) && n >= 1 && n <= 5) return String(6 - n);
  return answer;
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
  const labelMatch =
    (source.dimension || "").replace(/^\d+\.\s*/, "").trim().toLowerCase() ===
      (dest.dimension || "").replace(/^\d+\.\s*/, "").trim().toLowerCase() &&
    !!(source.dimension || dest.dimension);
  if (
    !!source.dimension_code?.trim() &&
    !!dest.dimension_code?.trim() &&
    !codeMatch &&
    textMatch &&
    !labelMatch
  ) {
    warnings.push("Dimension code and label differ");
  } else if (
    !!source.dimension_code?.trim() &&
    !!dest.dimension_code?.trim() &&
    !codeMatch &&
    textMatch &&
    labelMatch
  ) {
    warnings.push("Dimension code naming differs (same label)");
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
      return unmatchedMatch(src);
    }
    const dest = destById[hit.destId];
    return {
      sourceQuestionId: src.id,
      sourceText: src.question_text,
      sourceDimension: src.dimension || null,
      sourceDimensionCode: src.dimension_code || null,
      sourceType: src.question_type || null,
      sourceOrder: src.order_index ?? null,
      ...sourceScoring(src),
      destQuestionId: dest.id,
      destText: dest.question_text,
      destDimension: dest.dimension || null,
      destDimensionCode: dest.dimension_code || null,
      destType: dest.question_type || null,
      destOrder: dest.order_index ?? null,
      ...destScoring(dest),
      status: hit.status,
      warnings: hit.warnings,
    };
  });
}

function unmatchedMatch(src: SurveyQuestionRow): QuestionMatch {
  return {
    sourceQuestionId: src.id,
    sourceText: src.question_text,
    sourceDimension: src.dimension || null,
    sourceDimensionCode: src.dimension_code || null,
    sourceType: src.question_type || null,
    sourceOrder: src.order_index ?? null,
    ...sourceScoring(src),
    destQuestionId: null,
    destText: null,
    destDimension: null,
    destDimensionCode: null,
    destType: null,
    destOrder: null,
    ...destScoring(null),
    status: "unmatched",
    warnings: ["No matching question on destination survey"],
  };
}

function toUnmatched(match: QuestionMatch): QuestionMatch {
  return {
    ...match,
    destQuestionId: null,
    destText: null,
    destDimension: null,
    destDimensionCode: null,
    destType: null,
    destOrder: null,
    ...destScoring(null),
    status: "unmatched",
    warnings: ["No matching question on destination survey"],
  };
}

export const UNMATCHED_DEST = "__unmatched__";

/** Apply admin-picked source → dest question IDs after auto-match. 1:1 only. */
export function applyQuestionOverrides(
  matches: QuestionMatch[],
  destQuestions: SurveyQuestionRow[],
  overrides?: Record<string, string> | null
): QuestionMatch[] {
  if (!overrides || Object.keys(overrides).length === 0) return matches;

  const destById = Object.fromEntries(destQuestions.map((q) => [q.id, q]));
  const next = matches.map((m) => ({ ...m }));
  const destOwner = new Map<string, number>();
  next.forEach((m, i) => {
    if (m.destQuestionId) destOwner.set(m.destQuestionId, i);
  });

  for (const [sourceId, destId] of Object.entries(overrides)) {
    const idx = next.findIndex((m) => m.sourceQuestionId === sourceId);
    if (idx < 0) continue;
    const src = next[idx];

    if (!destId || destId === UNMATCHED_DEST) {
      if (src.destQuestionId) destOwner.delete(src.destQuestionId);
      next[idx] = toUnmatched(src);
      continue;
    }

    const dest = destById[destId];
    if (!dest) continue;

    const ownerIdx = destOwner.get(destId);
    if (ownerIdx != null && ownerIdx !== idx) {
      if (next[ownerIdx].destQuestionId) {
        destOwner.delete(next[ownerIdx].destQuestionId);
      }
      next[ownerIdx] = toUnmatched(next[ownerIdx]);
    }

    if (src.destQuestionId) destOwner.delete(src.destQuestionId);
    next[idx] = {
      ...src,
      destQuestionId: dest.id,
      destText: dest.question_text,
      destDimension: dest.dimension || null,
      destDimensionCode: dest.dimension_code || null,
      destType: dest.question_type || null,
      destOrder: dest.order_index ?? null,
      ...destScoring(dest),
      status: "manual",
      warnings: ["Manually mapped — wording or dimension may differ"],
    };
    destOwner.set(dest.id, idx);
  }

  return next;
}

export function collectDimensionLabels(
  questions: SurveyQuestionRow[]
): string[] {
  const set = new Set<string>();
  for (const q of questions) {
    const label = (q.dimension || "")
      .replace(/^\d+\.\s*/, "")
      .trim();
    if (label) set.add(label);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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

export type SourceAnswerStats = {
  responseCount: number
  averageScore: number | null
  averageLabel: string | null
  topLabel: string | null
  topPct: number | null
  counts: Array<{ option: string; count: number; pct: number }>
}

export function summarizeSourceAnswers(
  matches: QuestionMatch[],
  sourceResponses: Array<{ question_id: string; answer: string | null }>
): Record<string, SourceAnswerStats> {
  const byQuestion = new Map<string, string[]>()
  for (const row of sourceResponses) {
    const raw = (row.answer || "").trim()
    if (!raw) continue
    const list = byQuestion.get(row.question_id)
    if (list) list.push(raw)
    else byQuestion.set(row.question_id, [raw])
  }

  const stats: Record<string, SourceAnswerStats> = {}
  for (const match of matches) {
    const answers = byQuestion.get(match.sourceQuestionId) || []
    const options = (match.sourceOptions || []).map((o) => String(o).trim()).filter(Boolean)
    const optionIndex = new Map(options.map((o, i) => [o.toLowerCase(), i]))
    const counts = options.map((option) => ({ option, count: 0, pct: 0 }))
    const extras = new Map<string, number>()
    let scoreSum = 0
    let scoreN = 0

    for (const answer of answers) {
      const idx = optionIndex.get(answer.toLowerCase())
      if (idx != null) {
        counts[idx].count += 1
        scoreSum += idx + 1
        scoreN += 1
        continue
      }
      const n = parseFloat(answer)
      if (!Number.isNaN(n) && options.length > 1 && n >= 1 && n <= options.length) {
        const i = Math.round(n) - 1
        if (counts[i]) {
          counts[i].count += 1
          scoreSum += i + 1
          scoreN += 1
          continue
        }
      }
      extras.set(answer, (extras.get(answer) || 0) + 1)
    }

    const total = answers.length
    for (const row of counts) {
      row.pct = total ? Math.round((row.count / total) * 100) : 0
    }
    const extraRows = [...extras.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([option, count]) => ({
        option,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      }))

    const distribution = counts.some((c) => c.count > 0) ? counts : extraRows
    const ranked = [...distribution].sort((a, b) => b.count - a.count)
    const top = ranked[0]?.count ? ranked[0] : null
    const averageScore = scoreN ? scoreSum / scoreN : null
    const averageLabel =
      averageScore != null && options.length
        ? options[Math.min(options.length - 1, Math.max(0, Math.round(averageScore) - 1))]
        : top?.option || null

    stats[match.sourceQuestionId] = {
      responseCount: total,
      averageScore,
      averageLabel,
      topLabel: top?.option || null,
      topPct: top?.pct ?? null,
      counts: distribution,
    }
  }
  return stats
}
