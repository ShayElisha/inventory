import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { styleHeader, workbookToBuffer } from "@/lib/excel";
import { UNIT_OF_MEASURE } from "@/lib/constants";
import {
  IMPORT_TEMPLATE_HEADERS_HE,
  IMPORT_TEMPLATE_SAMPLE,
  SUGGESTED_CATEGORIES,
} from "@/lib/product-import";

/** הורדת תבנית Excel לייבוא מוצרים + גיליון קטגוריות */
export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const existingCategories = await prisma.category.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
    select: { name: true, hasVariants: true },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sfira";
  wb.created = new Date();

  const products = wb.addWorksheet("מוצרים", {
    views: [{ rightToLeft: true }],
  });
  products.addRow([...IMPORT_TEMPLATE_HEADERS_HE]);
  styleHeader(products.getRow(1));
  for (const row of IMPORT_TEMPLATE_SAMPLE) {
    products.addRow(row);
  }
  products.columns.forEach((col) => {
    col.width = 16;
  });
  products.getColumn(1).width = 22;
  products.getColumn(3).width = 18;

  // רשימת יחידות לעזרה
  const unitSheet = wb.addWorksheet("יחידות", {
    views: [{ rightToLeft: true }],
  });
  unitSheet.addRow(["קוד", "תווית"]);
  styleHeader(unitSheet.getRow(1));
  for (const u of UNIT_OF_MEASURE) {
    unitSheet.addRow([u.code, u.label]);
  }
  unitSheet.columns.forEach((c) => {
    c.width = 14;
  });

  const cats = wb.addWorksheet("קטגוריות", {
    views: [{ rightToLeft: true }],
  });
  cats.addRow(["שם קטגוריה", "מקור"]);
  styleHeader(cats.getRow(1));

  const seen = new Set<string>();
  for (const c of existingCategories) {
    cats.addRow([c.name, "קיימת בחברה"]);
    seen.add(c.name);
  }
  for (const name of SUGGESTED_CATEGORIES) {
    if (seen.has(name)) continue;
    cats.addRow([name, "מומלצת (תיווצר בייבוא אם חסרה)"]);
    seen.add(name);
  }
  cats.columns.forEach((c) => {
    c.width = 28;
  });

  const help = wb.addWorksheet("הוראות", {
    views: [{ rightToLeft: true }],
  });
  help.addRow(["הוראות ייבוא מוצרים"]);
  styleHeader(help.getRow(1));
  const lines = [
    "1. מלאו את גיליון «מוצרים» — אל תשנו את שורת הכותרות.",
    "2. עמודת «קטגוריה» — אפשר לבחור שם מגיליון «קטגוריות» או לכתוב שם חדש (ייווצר אוטומטית).",
    "3. מקט (מק״ט בסיס) חובה. SKU וברקוד — אם ריקים יופקו מהמק״ט.",
    "4. יחידה: השתמשו בקוד מגיליון «יחידות» (למשל UNIT, KG, LITER).",
    "5. מיקום — רק אם קיים כבר במערכת (קוד מדף).",
    "6. שמרו כ־.xlsx והעלו במסך ייבוא ועדכון כמותי.",
    "7. מקסימום 2,000 שורות לייבוא.",
  ];
  for (const line of lines) help.addRow([line]);
  help.getColumn(1).width = 90;

  const buf = await workbookToBuffer(wb);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="sfira-products-import-template.xlsx"',
    },
  });
}
