import ExcelJS from "exceljs";
import {
  SURVEY_CSV_HEADERS,
  buildSurveyCsvTemplate,
  parseSurveyCsv,
  questionsToCsv,
  type SurveyQuestionExportRow,
} from "./survey-csv";

const BOOL_LIST = '"TRUE,FALSE"';
const SCORING_LIST = '"positive,negative,text"';
const TYPE_LIST = '"radio,likert,multiple-choice,text"';

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function sampleRowValues(): string[] {
  const csv = buildSurveyCsvTemplate();
  const lines = csv.split(/\r?\n/).filter(Boolean);
  return parseCsvLine(lines[1] || "");
}

function applyDropdowns(ws: ExcelJS.Worksheet, rowCount = 500) {
  const last = Math.max(rowCount, 50);
  ws.dataValidations.add(`C2:C${last}`, {
    type: "list",
    allowBlank: true,
    formulae: [TYPE_LIST],
    showErrorMessage: true,
    errorTitle: "Invalid type",
    error: "Choose radio, likert, multiple-choice, or text",
  });
  ws.dataValidations.add(`F2:F${last}`, {
    type: "list",
    allowBlank: true,
    formulae: [BOOL_LIST],
    showErrorMessage: true,
    errorTitle: "Invalid value",
    error: "Choose TRUE or FALSE",
  });
  ws.dataValidations.add(`H2:H${last}`, {
    type: "list",
    allowBlank: true,
    formulae: [SCORING_LIST],
    showErrorMessage: true,
    errorTitle: "Invalid scoring type",
    error: "Choose positive, negative, or text",
  });
}

function styleHeaderAndWidths(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true };
  const widths: Record<number, number> = {
    1: 48,
    2: 40,
    3: 16,
    4: 55,
    5: 55,
    6: 14,
    7: 16,
    8: 14,
    9: 12,
    10: 12,
    11: 12,
  };
  Object.entries(widths).forEach(([col, width]) => {
    ws.getColumn(Number(col)).width = width;
  });
}

export async function buildSurveyExcelTemplateBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Questions");
  ws.addRow([...SURVEY_CSV_HEADERS]);
  ws.addRow(sampleRowValues());
  styleHeaderAndWidths(ws);
  applyDropdowns(ws);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function questionsToExcelBuffer(
  rows: SurveyQuestionExportRow[]
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Questions");
  const csv = questionsToCsv(rows);
  const table = csv.split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  table.forEach((row) => ws.addRow(row));
  styleHeaderAndWidths(ws);
  applyDropdowns(ws, Math.max(table.length + 50, 100));
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function downloadExcel(filename: string, buffer: ArrayBuffer) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fileToSurveyCsvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type.includes("csv")) {
    return file.text();
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("Excel file has no worksheet.");

    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = SURVEY_CSV_HEADERS.map((_, idx) => {
        const cell = row.getCell(idx + 1);
        const v = cell.value;
        if (v == null) return "";
        if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
        if (typeof v === "object" && v && "text" in v) {
          return String((v as { text: string }).text);
        }
        if (typeof v === "object" && v && "result" in v) {
          return String((v as { result: unknown }).result ?? "");
        }
        return String(v);
      });
      rows.push(values);
    });

    const escape = (value: string) => {
      if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
      return value;
    };
    return rows.map((r) => r.map(escape).join(",")).join("\r\n");
  }

  throw new Error("Please upload a .csv or .xlsx file.");
}

export async function parseSurveyFile(file: File) {
  const text = await fileToSurveyCsvText(file);
  return parseSurveyCsv(text);
}
