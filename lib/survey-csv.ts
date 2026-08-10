/**
 * Survey question CSV import/export helpers.
 * Compatible with survey_questions fields used in create/edit survey.
 */

export const SURVEY_CSV_HEADERS = [
  "question_text",
  "translated_question",
  "question_type",
  "options",
  "translated_options",
  "is_required",
  "dimension_code",
  "scoring_type",
  "max_score",
  "min_score",
  "order_index",
] as const;

/** Negative scoring type means the item is reverse-scored. */
export function isReverseScoring(scoringType?: string | null): boolean {
  return (scoringType ?? "").trim().toLowerCase() === "negative";
}

export type SurveyCsvHeader = (typeof SURVEY_CSV_HEADERS)[number];

export type ImportQuestionDraft = {
  localId: string;
  question_text: string;
  translated_question: string;
  question_type: "text" | "multiple-choice" | "radio" | "likert";
  options: string[];
  translated_options: string[];
  is_required: boolean;
  dimension: string;
  dimension_code: string;
  scoring_type: string;
  max_score: number | null;
  min_score: number | null;
  reverse_score: boolean;
  order_index: number;
  errors: string[];
};

export type SurveyQuestionExportRow = {
  question_text: string;
  translated_question?: string | null;
  question_type: string;
  options?: string[] | null;
  translated_options?: string[] | null;
  is_required?: boolean | null;
  dimension_code?: string | null;
  scoring_type?: string | null;
  max_score?: number | null;
  min_score?: number | null;
  /** @deprecated Derived from scoring_type === "negative"; kept for typed callers. */
  reverse_score?: boolean | null;
  order_index?: number | null;
};

const SAMPLE_OPTIONS = [
  "Strongly Disagree",
  "Disagree",
  "Undecided",
  "Agree",
  "Strongly Agree",
];

const SAMPLE_TRANSLATED_OPTIONS = [
  "Matinding Hindi Pagsang-ayon",
  "Hindi Sumasang-ayon",
  "Hindi Tiyak",
  "Pagsang-ayon",
  "Matinding Pagsang-ayon",
];

/** Downloadable template with headers + one sample Likert row. */
export function buildSurveyCsvTemplate(): string {
  const sample: Record<SurveyCsvHeader, string> = {
    question_text: "Employees at all levels model safety-conscious behavior.",
    translated_question:
      "Lahat ng antas ng empleyado ay nagpapakita ng maayos na asal ukol sa kaligtasan.",
    question_type: "radio",
    options: SAMPLE_OPTIONS.join(", "),
    translated_options: SAMPLE_TRANSLATED_OPTIONS.join(", "),
    is_required: "FALSE",
    dimension_code: "SC05",
    scoring_type: "positive",
    max_score: "5",
    min_score: "1",
    order_index: "1",
  };

  return rowsToCsv([
    [...SURVEY_CSV_HEADERS],
    SURVEY_CSV_HEADERS.map((h) => sample[h]),
  ]);
}

export function questionsToCsv(rows: SurveyQuestionExportRow[]): string {
  const dataRows = rows.map((row, index) =>
    SURVEY_CSV_HEADERS.map((header) => {
      switch (header) {
        case "question_text":
          return row.question_text ?? "";
        case "translated_question":
          return row.translated_question ?? "";
        case "question_type":
          return row.question_type ?? "text";
        case "options":
          return row.options?.length ? formatListField(row.options) : "";
        case "translated_options":
          return row.translated_options?.length
            ? formatListField(row.translated_options)
            : "";
        case "is_required":
          return row.is_required ? "TRUE" : "FALSE";
        case "dimension_code":
          return row.dimension_code ?? "";
        case "scoring_type":
          return row.scoring_type ?? "";
        case "max_score":
          return row.max_score != null ? String(row.max_score) : "";
        case "min_score":
          return row.min_score != null ? String(row.min_score) : "";
        case "order_index":
          return String(row.order_index ?? index);
        default:
          return "";
      }
    })
  );

  return rowsToCsv([[...SURVEY_CSV_HEADERS], ...dataRows]);
}

export function parseSurveyCsv(csvText: string): ImportQuestionDraft[] {
  const table = parseCsv(csvText);
  if (table.length < 2) {
    throw new Error("CSV must include a header row and at least one question.");
  }

  const headerRow = table[0].map((h) => normalizeHeader(h));
  const required = ["question_text", "question_type"] as const;
  for (const key of required) {
    if (!headerRow.includes(key)) {
      throw new Error(`Missing required column: ${key}`);
    }
  }

  const drafts: ImportQuestionDraft[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((c) => !c.trim())) continue;

    const get = (key: SurveyCsvHeader | string) => {
      const idx = headerRow.indexOf(normalizeHeader(key));
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const questionText = get("question_text");
    const rawType = get("question_type").toLowerCase() || "text";
    const questionType = normalizeQuestionType(rawType);
    const options = parseListField(get("options"));
    const translatedOptions = parseListField(get("translated_options"));
    const dimensionCode = get("dimension_code");
    let scoringType =
      get("scoring_type") || (questionType === "text" ? "text" : "positive");
    // Legacy CSV/Excel may still include reverse_score; fold it into scoring_type.
    const legacyReverse = parseBoolean(get("reverse_score"));
    if (
      legacyReverse &&
      scoringType.toLowerCase() !== "text" &&
      scoringType.toLowerCase() !== "negative"
    ) {
      scoringType = "negative";
    }
    const reverseScore = isReverseScoring(scoringType);
    const maxScore = parseOptionalNumber(get("max_score"));
    const minScore = parseOptionalNumber(get("min_score"));
    const isRequired = parseBoolean(get("is_required"));
    const orderIndex = parseOptionalNumber(get("order_index")) ?? i - 1;

    const errors: string[] = [];
    if (!questionText) errors.push("Question text is required");
    if (!questionType) errors.push("Invalid question type");
    if (
      ["radio", "multiple-choice", "likert"].includes(questionType) &&
      options.length === 0
    ) {
      errors.push("Options are required for this question type");
    }

    drafts.push({
      localId: `import-${i}-${Date.now()}`,
      question_text: questionText,
      translated_question: get("translated_question"),
      question_type: questionType,
      options,
      translated_options: translatedOptions,
      is_required: isRequired,
      dimension: "",
      dimension_code: dimensionCode,
      scoring_type: scoringType,
      max_score: maxScore,
      min_score: minScore,
      reverse_score: reverseScore,
      order_index: orderIndex,
      errors,
    });
  }

  if (drafts.length === 0) {
    throw new Error("No question rows found in CSV.");
  }

  return drafts.sort((a, b) => a.order_index - b.order_index);
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeQuestionType(
  value: string
): ImportQuestionDraft["question_type"] {
  if (value === "multiple_choice" || value === "multiple-choice") {
    return "multiple-choice";
  }
  if (value === "radio" || value === "likert" || value === "text") {
    return value;
  }
  return "text";
}

function parseBoolean(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "y";
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Accepts comma-separated values (preferred). Also accepts JSON arrays, |, or ;. */
export function parseListField(value: string): string[] {
  const raw = value.trim();
  if (!raw) return [];

  // Back-compat for older exports that used JSON arrays
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall through to comma split
    }
  }

  const delimiter = raw.includes("|")
    ? "|"
    : raw.includes(";")
      ? ";"
      : ",";

  return raw
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatListField(values: string[]): string {
  if (!values.length) return "";
  return values.join(", ");
}

/**
 * Decode CSV bytes as UTF-8, falling back to Windows-1252.
 * Excel on Windows often saves CSV with curly quotes/dashes in CP1252,
 * which become "" when forced through UTF-8.
 */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): string {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let offset = 0;
  if (
    data.length >= 3 &&
    data[0] === 0xef &&
    data[1] === 0xbb &&
    data[2] === 0xbf
  ) {
    offset = 3;
  }
  const view = offset ? data.subarray(offset) : data;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(view);
  } catch {
    return new TextDecoder("windows-1252").decode(view);
  }
}

export async function readCsvFileText(file: File): Promise<string> {
  return decodeCsvBytes(await file.arrayBuffer());
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char === "\r") {
      // ignore; handle on \n
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}
