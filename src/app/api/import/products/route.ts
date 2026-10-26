import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { writeAudit } from "@/lib/audit";
import { getSession, canWrite } from "@/lib/auth";
import {
  importProductRows,
  mapHeaders,
  rowFromValues,
  type ImportProductRow,
} from "@/lib/product-import";

export const maxDuration = 60;

/** ייבוא מוצרים מ־CSV או Excel (.xlsx) */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let rows: ImportProductRow[] = [];
    let sourceLabel = "ייבוא CSV";

    if (
      contentType.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("multipart/form-data")
    ) {
      sourceLabel = "ייבוא Excel";
      let buffer: ArrayBuffer;

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return NextResponse.json(
            { error: "חסר קובץ Excel (שדה file)" },
            { status: 400 }
          );
        }
        const name = file.name.toLowerCase();
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
          return NextResponse.json(
            { error: "יש להעלות קובץ Excel (.xlsx) או CSV" },
            { status: 400 }
          );
        }
        if (name.endsWith(".csv")) {
          sourceLabel = "ייבוא CSV";
          const text = await file.text();
          rows = parseCsvText(text);
        } else {
          buffer = await file.arrayBuffer();
          rows = await parseExcelBuffer(buffer);
        }
      } else {
        buffer = await req.arrayBuffer();
        rows = await parseExcelBuffer(buffer);
      }
    } else {
      // text/csv או JSON
      if (contentType.includes("application/json")) {
        const body = await req.json();
        if (!Array.isArray(body.rows)) {
          return NextResponse.json({ error: "חסרות שורות" }, { status: 400 });
        }
        rows = body.rows as ImportProductRow[];
        sourceLabel = "ייבוא JSON";
      } else {
        const text = await req.text();
        rows = parseCsvText(text);
      }
    }

    if (!rows.length) {
      return NextResponse.json(
        { error: "לא נמצאו שורות לייבוא (בדקו כותרות וגיליון מוצרים)" },
        { status: 400 }
      );
    }

    if (rows.length > 2000) {
      return NextResponse.json(
        { error: "מקסימום 2,000 שורות לייבוא אחד" },
        { status: 400 }
      );
    }

    const result = await importProductRows(
      session.companyId,
      session.id,
      rows,
      sourceLabel
    );

    await writeAudit({
      action: "IMPORT_PRODUCTS",
      entityType: "Product",
      userId: session.id,
      details: {
        source: sourceLabel,
        created: result.created,
        errors: result.errors.length,
        categoriesCreated: result.categoriesCreated,
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "שגיאה בייבוא",
      },
      { status: 400 }
    );
  }
}

function parseCsvText(text: string): ImportProductRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = mapHeaders(splitCsv(lines[0]));
  const rows: ImportProductRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parsed = rowFromValues(headers, splitCsv(lines[i]), i + 1);
    if ("error" in parsed) continue;
    rows.push(parsed);
  }
  return rows;
}

async function parseExcelBuffer(buffer: ArrayBuffer): Promise<ImportProductRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const sheet =
    wb.getWorksheet("מוצרים") ||
    wb.getWorksheet("Products") ||
    wb.worksheets[0];
  if (!sheet) return [];

  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = excelCellToString(cell);
    });
    matrix.push(values);
  });

  if (matrix.length < 2) return [];

  const headerCells = matrix[0].map((h) => String(h ?? ""));
  const headers = mapHeaders(headerCells);
  if (!headers.some(Boolean)) {
    throw new Error(
      "לא זוהו כותרות. השתמשו בתבנית (שם, מקט, קטגוריה, ברקוד…)"
    );
  }

  const rows: ImportProductRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const values = matrix[i];
    // skip fully empty rows
    if (values.every((v) => String(v ?? "").trim() === "")) continue;
    const parsed = rowFromValues(headers, values, i + 1);
    if ("error" in parsed) continue;
    rows.push(parsed);
  }
  return rows;
}

function excelCellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "number") {
    // ברקודים ארוכים — בלי סימון מדעי
    if (Number.isInteger(v) && Math.abs(v) >= 1e11) {
      return v.toLocaleString("fullwide", { useGrouping: false });
    }
    return String(v);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") {
    if ("result" in v && v.result != null) return String(v.result);
    if ("text" in v && (v as { text?: string }).text) {
      return String((v as { text: string }).text);
    }
    if ("richText" in v && Array.isArray((v as { richText: { text: string }[] }).richText)) {
      return (v as { richText: { text: string }[] }).richText
        .map((t) => t.text)
        .join("");
    }
  }
  return String(cell.text || v).trim();
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if ((c === "," || c === "\t") && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}
