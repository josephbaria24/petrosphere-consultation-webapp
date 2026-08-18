import ExcelJS from "exceljs";

export type ExportColumn = { header: string; key: string; width?: number };

export type ExportSheet = {
  name: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
};

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function sheetsToCsv(sheets: ExportSheet[]): string {
  const parts: string[] = [];
  for (const sheet of sheets) {
    parts.push(`# ${sheet.name}`);
    parts.push(sheet.columns.map((c) => csvEscape(c.header)).join(","));
    for (const row of sheet.rows) {
      parts.push(sheet.columns.map((c) => csvEscape(row[c.key])).join(","));
    }
    parts.push("");
  }
  return parts.join("\r\n");
}

export async function sheetsToExcelBuffer(
  sheets: ExportSheet[],
  title?: string
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Safety Vitals";
  wb.created = new Date();
  if (title) wb.title = title;

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31));
    ws.columns = sheet.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.min(Math.max(c.header.length + 4, 14), 48),
    }));
    for (const row of sheet.rows) {
      ws.addRow(row);
    }
    const header = ws.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: "middle", wrapText: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export const RESPONSE_EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Respondent name", key: "respondent_name", width: 24 },
  { header: "Email", key: "email", width: 28 },
  { header: "Role", key: "role", width: 16 },
  { header: "Department", key: "department", width: 18 },
  { header: "Site", key: "site", width: 16 },
  { header: "User ID", key: "user_id", width: 38 },
  { header: "Question order", key: "question_order", width: 14 },
  { header: "Dimension", key: "dimension", width: 32 },
  { header: "Dimension code", key: "dimension_code", width: 16 },
  { header: "Question", key: "question", width: 60 },
  { header: "Answer", key: "answer", width: 40 },
  { header: "Answered at", key: "created_at", width: 22 },
  { header: "Source response ID", key: "source_response_id", width: 38 },
  { header: "Dest response ID", key: "dest_response_id", width: 38 },
  { header: "Status", key: "status", width: 18 },
];
