import { NextRequest, NextResponse } from "next/server";
import { getSession, canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { parseCsvMatrix } from "@/lib/csv-parse";
import {
  importSalesOrderRows,
  mapSalesOrderHeaders,
  salesOrderRowFromValues,
  type ImportSalesOrderRow,
} from "@/lib/orders-import";
import { assertPermission } from "@/lib/require-permission";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const perm = await assertPermission(session, "sales.write");
  if (!perm.ok) return perm.error;

  try {
    const contentType = req.headers.get("content-type") || "";
    let rows: ImportSalesOrderRow[] = [];
    const errors: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "חסר קובץ" }, { status: 400 });
      }
      rows = parseOrdersCsv(await file.text(), errors);
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      rows = Array.isArray(body.rows) ? body.rows : [];
    } else {
      rows = parseOrdersCsv(await req.text(), errors);
    }

    if (!rows.length) {
      return NextResponse.json(
        { error: "לא נמצאו שורות", details: errors.slice(0, 5) },
        { status: 400 }
      );
    }

    const result = await importSalesOrderRows(
      session.companyId,
      session.id,
      rows
    );
    await writeAudit({
      action: "IMPORT_SALES_ORDERS",
      entityType: "SalesOrder",
      details: result,
    });
    return NextResponse.json({ ...result, parseErrors: errors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה" },
      { status: 400 }
    );
  }
}

function parseOrdersCsv(text: string, errors: string[]) {
  const matrix = parseCsvMatrix(text);
  if (matrix.length < 2) return [];
  const headers = mapSalesOrderHeaders(matrix[0]);
  const rows: ImportSalesOrderRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const parsed = salesOrderRowFromValues(headers, matrix[i], i + 1);
    if ("error" in parsed) {
      errors.push(parsed.error);
      continue;
    }
    rows.push(parsed);
  }
  return rows;
}
