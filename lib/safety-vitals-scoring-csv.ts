/**
 * Parser for the Safety Vitals Scoring (Survey & Scoring) CSV format used by consultants.
 * Maps instrument rows into ImportQuestionDraft for survey creation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ImportQuestionDraft,
  isReverseScoring,
  decodeCsvBytes,
  parseCsv,
} from "./survey-csv";

export const SAFETY_VITALS_SCORING_CSV_PATH =
  "/Safety Vitals Scoring (Survey & Scoring).csv";

/** Dedicated dimension set for the Safety Vitals scoring instrument (not Default). */
export const SAFETY_VITALS_DIMENSION_SET_NAME = "Safety Vitals Scoring";

export const SAFETY_VITALS_DIMENSION_SET_DESCRIPTION =
  "Dimensions from the Safety Vitals Scoring (Survey & Scoring) instrument used by consultants.";

export const DEFAULT_LIKERT_OPTIONS = [
  "Strongly Disagree",
  "Disagree",
  "Undecided",
  "Agree",
  "Strongly Agree",
];

export const DEFAULT_LIKERT_TRANSLATED_OPTIONS = [
  "Matinding Hindi Pagsang-ayon",
  "Hindi Sumasang-ayon",
  "Hindi Tiyak",
  "Pagsang-ayon",
  "Matinding Pagsang-ayon",
];

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, "_");
}

function cell(
  headerRow: string[],
  cells: string[],
  ...keys: string[]
): string {
  for (const key of keys) {
    const idx = headerRow.indexOf(normalizeHeader(key));
    if (idx >= 0) return (cells[idx] ?? "").trim();
  }
  return "";
}

function polarityToScoringType(polarity: string): string {
  const p = polarity.toLowerCase();
  if (p.includes("negative") || p.includes("reverse")) return "negative";
  return "positive";
}

/** CSA01 → CSA, EI02 → EI (item code → dimension code). */
export function itemCodeToDimensionCode(itemCode: string): string {
  const match = itemCode.trim().match(/^([A-Za-z]+)/);
  return (match?.[1] || itemCode).toUpperCase();
}

export type SafetyVitalsDimensionSeed = {
  code: string;
  dimension_name: string;
  description?: string | null;
};

/** Unique dimensions from parsed scoring drafts (one row per dimension code). */
export function uniqueDimensionsFromDrafts(
  drafts: ImportQuestionDraft[]
): SafetyVitalsDimensionSeed[] {
  const map = new Map<string, SafetyVitalsDimensionSeed>();
  for (const q of drafts) {
    const code = itemCodeToDimensionCode(q.dimension_code);
    if (!map.has(code)) {
      map.set(code, {
        code,
        dimension_name: q.dimension || code,
        description: null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.dimension_name.localeCompare(b.dimension_name)
  );
}

/**
 * Ensure the "Safety Vitals Scoring" dimension set exists and contains
 * all dimensions from the loaded instrument. Returns the set id.
 */
export async function ensureSafetyVitalsDimensionSet(
  client: SupabaseClient,
  drafts: ImportQuestionDraft[],
  orgId?: string | null
): Promise<{ setId: string; dimensionCount: number }> {
  const seeds = uniqueDimensionsFromDrafts(drafts);
  if (seeds.length === 0) {
    throw new Error("No dimensions found in the loaded questions.");
  }

  let setId: string | null = null;

  const { data: existingSets, error: findError } = await client
    .from("dimension_sets")
    .select("id, name, org_id")
    .eq("name", SAFETY_VITALS_DIMENSION_SET_NAME)
    .order("created_at", { ascending: true });

  if (findError) {
    throw new Error(findError.message || "Failed to look up dimension sets");
  }

  const preferred =
    (orgId && existingSets?.find((s) => s.org_id === orgId)) ||
    existingSets?.find((s) => s.org_id == null) ||
    existingSets?.[0];

  if (preferred) {
    setId = preferred.id;
  } else {
    const { data: created, error: createError } = await client
      .from("dimension_sets")
      .insert([
        {
          name: SAFETY_VITALS_DIMENSION_SET_NAME,
          description: SAFETY_VITALS_DIMENSION_SET_DESCRIPTION,
          org_id: orgId || null,
        },
      ])
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(
        createError?.message || "Failed to create Safety Vitals dimension set"
      );
    }
    setId = created.id;
  }

  const { data: existingDims, error: dimsError } = await client
    .from("dimensions")
    .select("id, code")
    .eq("set_id", setId);

  if (dimsError) {
    throw new Error(dimsError.message || "Failed to load dimensions in set");
  }

  const existingCodes = new Set(
    (existingDims || []).map((d) => (d.code || "").toUpperCase())
  );
  const toInsert = seeds
    .filter((s) => !existingCodes.has(s.code.toUpperCase()))
    .map((s) => ({
      code: s.code,
      dimension_name: s.dimension_name,
      description: s.description ?? null,
      set_id: setId,
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await client
      .from("dimensions")
      .insert(toInsert);
    if (insertError) {
      throw new Error(
        insertError.message || "Failed to add dimensions to the set"
      );
    }
  }

  for (const seed of seeds) {
    if (!existingCodes.has(seed.code.toUpperCase())) continue;
    await client
      .from("dimensions")
      .update({ dimension_name: seed.dimension_name })
      .eq("set_id", setId)
      .eq("code", seed.code);
  }

  return { setId, dimensionCount: seeds.length };
}

/** Parse Safety Vitals Scoring CSV text into survey question drafts. */
export function parseSafetyVitalsScoringCsv(
  csvText: string
): ImportQuestionDraft[] {
  const table = parseCsv(csvText);
  if (table.length < 2) {
    throw new Error("CSV must include a header row and at least one question.");
  }

  const headerRow = table[0].map(normalizeHeader);
  const hasStatement = [
    "scenario-based_statement",
    "scenario_based_statement",
    "question_text",
  ].some((k) => headerRow.includes(k));
  const hasCode = headerRow.includes("dimension_code");
  if (!hasStatement || !hasCode) {
    throw new Error(
      "This does not look like the Safety Vitals Scoring CSV. Expected columns like Dimension Code and Scenario-Based Statement."
    );
  }

  const drafts: ImportQuestionDraft[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((c) => !c.trim())) continue;

    const questionText = cell(
      headerRow,
      cells,
      "scenario-based_statement",
      "scenario_based_statement",
      "question_text"
    );
    const itemCode = cell(headerRow, cells, "dimension_code");
    const dimensionName = cell(headerRow, cells, "dimension");
    const translated = cell(
      headerRow,
      cells,
      "pahayag_sa_filipino",
      "translated_question"
    );
    const polarity = cell(
      headerRow,
      cells,
      "item_polarity",
      "polarity",
      "scoring_type"
    );

    if (!questionText || !itemCode) continue;

    const scoringType = polarityToScoringType(polarity);
    const dimensionCode = itemCodeToDimensionCode(itemCode);
    const errors: string[] = [];
    if (!questionText) errors.push("Question text is required");
    if (!dimensionCode) errors.push("Dimension code is required");

    drafts.push({
      localId: `sv-${itemCode}-${i}-${Date.now()}`,
      question_text: questionText,
      translated_question: translated,
      question_type: "radio",
      options: [...DEFAULT_LIKERT_OPTIONS],
      translated_options: [...DEFAULT_LIKERT_TRANSLATED_OPTIONS],
      is_required: true,
      dimension: dimensionName,
      dimension_code: dimensionCode,
      scoring_type: scoringType,
      max_score: 5,
      min_score: 1,
      reverse_score: isReverseScoring(scoringType),
      order_index: drafts.length,
      errors,
    });
  }

  if (drafts.length === 0) {
    throw new Error("No question rows found in the Safety Vitals Scoring CSV.");
  }

  return drafts
    .sort((a, b) => {
      const byDim = a.dimension.localeCompare(b.dimension);
      if (byDim !== 0) return byDim;
      return a.localId.localeCompare(b.localId);
    })
    .map((q, index) => ({ ...q, order_index: index }));
}

export async function fetchSafetyVitalsScoringCsv(): Promise<string> {
  const res = await fetch(encodeURI(SAFETY_VITALS_SCORING_CSV_PATH));
  if (!res.ok) {
    throw new Error(
      `Could not load built-in scoring CSV (${res.status}). Upload the file manually instead.`
    );
  }
  return decodeCsvBytes(await res.arrayBuffer());
}
