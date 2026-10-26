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

/** הורדת תבנית Excel לייבוא מוצרים + גיליון קטגוריות ושדות מותאמים */
export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const [existingCategories, customFields] = await Promise.all([
    prisma.category.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, hasVariants: true, attributeSchema: true },
    }),
    prisma.customField.findMany({
      where: {
        companyId: session.companyId,
        entityType: "PRODUCT",
        active: true,
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sfira";
  wb.created = new Date();

  const extraFieldHeaders = customFields.map((f) => f.label);
  const products = wb.addWorksheet("מוצרים", {
    views: [{ rightToLeft: true }],
  });
  products.addRow([...IMPORT_TEMPLATE_HEADERS_HE, ...extraFieldHeaders]);
  styleHeader(products.getRow(1));
  for (const row of IMPORT_TEMPLATE_SAMPLE) {
    // דוגמאות ללא ערכי שדות מותאמים — עמודות ריקות בסוף
    products.addRow([...row, ...extraFieldHeaders.map(() => "")]);
  }
  products.columns.forEach((col) => {
    col.width = 16;
  });
  products.getColumn(1).width = 22;
  products.getColumn(3).width = 18;

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
  cats.addRow(["שם קטגוריה", "מקור", "מאפיינים"]);
  styleHeader(cats.getRow(1));

  const seen = new Set<string>();
  for (const c of existingCategories) {
    let attrs = "";
    try {
      const parsed = JSON.parse(c.attributeSchema || "[]");
      if (Array.isArray(parsed)) attrs = parsed.map(String).join(", ");
    } catch {
      /* ignore */
    }
    cats.addRow([c.name, "קיימת בחברה", attrs]);
    seen.add(c.name);
  }
  for (const name of SUGGESTED_CATEGORIES) {
    if (seen.has(name)) continue;
    cats.addRow([name, "מומלצת (תיווצר בייבוא אם חסרה)", ""]);
    seen.add(name);
  }
  cats.columns.forEach((c) => {
    c.width = 28;
  });

  const fieldsSheet = wb.addWorksheet("שדות מותאמים", {
    views: [{ rightToLeft: true }],
  });
  fieldsSheet.addRow(["תווית עמודה באקסל", "מפתח", "קטגוריה", "סוג"]);
  styleHeader(fieldsSheet.getRow(1));
  if (customFields.length === 0) {
    fieldsSheet.addRow([
      "(אין שדות מוגדרים)",
      "",
      "הגדירו בהגדרות בסיס",
      "",
    ]);
  } else {
    for (const f of customFields) {
      fieldsSheet.addRow([
        f.label,
        f.key,
        f.category?.name || "כל הקטגוריות",
        f.fieldType,
      ]);
    }
  }
  fieldsSheet.columns.forEach((c) => {
    c.width = 22;
  });

  const help = wb.addWorksheet("הוראות", {
    views: [{ rightToLeft: true }],
  });
  help.addRow(["הוראות ייבוא מוצרים"]);
  styleHeader(help.getRow(1));
  const lines = [
    "1. מלאו את גיליון «מוצרים» — אל תשנו את שורת הכותרות הקבועות.",
    "2. עמודת «קטגוריה» — שם מגיליון «קטגוריות» או שם חדש (ייווצר אוטומטית).",
    "3. מקט (מק״ט בסיס) חובה. SKU וברקוד — אם ריקים יופקו מהמק״ט.",
    "4. יחידה: קוד מגיליון «יחידות» (למשל UNIT, KG, LITER).",
    "5. מיקום — רק אם קיים כבר במערכת (קוד מדף).",
    "6. עמודות נוספות (מידה, צבע, מותג…) — נשמרות כמאפייני וריאנט ומתווספות לסכמת הקטגוריה.",
    "7. שדות מותאמים שהוגדרו בהגדרות — כותרת העמודה = שם השדה (ראו גיליון «שדות מותאמים»).",
    "8. שמרו כ־.xlsx והעלו במסך ייבוא ועדכון כמותי. מקסימום 2,000 שורות.",
  ];
  for (const line of lines) help.addRow([line]);
  help.getColumn(1).width = 100;

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
