import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import { writeAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";

/** CSV: title,baseSku,categoryName,barcode,sku,costPrice,sellingPrice,qty,unitOfMeasure */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const text = await req.text();
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return NextResponse.json({ error: "קובץ ריק" }, { status: 400 });
  }

  const headers = splitCsv(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  let created = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsv(lines[i]);
    try {
      const title = cols[idx("title")] || cols[idx("שם")];
      const baseSku = (cols[idx("basesku")] || cols[idx("מקט")] || "").toUpperCase();
      const categoryName = cols[idx("categoryname")] || cols[idx("קטגוריה")] || "כללי";
      const barcode = cols[idx("barcode")] || cols[idx("ברקוד")] || `${baseSku}-${i}`;
      const sku = (cols[idx("sku")] || baseSku).toUpperCase();
      const costPrice = Number(cols[idx("costprice")] || cols[idx("עלות")] || 0);
      const sellingPrice = Number(cols[idx("sellingprice")] || cols[idx("מכירה")] || 0);
      const qty = Number(cols[idx("qty")] || cols[idx("כמות")] || 0);
      const unit = (cols[idx("unitofmeasure")] || cols[idx("יחידה")] || "UNIT").toUpperCase();

      if (!title || !baseSku) {
        errors.push(`שורה ${i + 1}: חסר שם או מק״ט`);
        continue;
      }

      let category = await prisma.category.findFirst({
        where: { companyId: session.companyId, name: categoryName },
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            companyId: session.companyId,
            name: categoryName,
            hasVariants: false,
            attributeSchema: "[]",
          },
        });
      }

      let product = await prisma.product.findFirst({
        where: { companyId: session.companyId, baseSku },
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            companyId: session.companyId,
            title,
            baseSku,
            categoryId: category.id,
            costPrice,
            sellingPrice,
            unitOfMeasure: ["UNIT", "CARTON", "SQM"].includes(unit) ? unit : "UNIT",
          },
        });
      }

      const existing = await prisma.productVariant.findFirst({
        where: {
          companyId: session.companyId,
          OR: [{ sku }, { barcode }],
        },
      });
      if (existing) {
        errors.push(`שורה ${i + 1}: SKU/ברקוד קיים`);
        continue;
      }

      const variant = await prisma.productVariant.create({
        data: {
          companyId: session.companyId,
          productId: product.id,
          sku,
          barcode,
          attributes: stringifyJson({}),
          quantityOnHand: qty,
        },
      });

      if (qty > 0) {
        await prisma.stockTransaction.create({
          data: {
            variantId: variant.id,
            type: "INBOUND",
            quantityChanged: qty,
            previousQuantity: 0,
            newQuantity: qty,
            reason: "ייבוא CSV",
            reasonCode: "IMPORT",
            userId: session?.id,
          },
        });
      }
      created++;
    } catch (e) {
      errors.push(`שורה ${i + 1}: ${e instanceof Error ? e.message : "שגיאה"}`);
    }
  }

  await writeAudit({
    action: "IMPORT_CSV",
    entityType: "Product",
    details: { created, errors: errors.length },
  });

  return NextResponse.json({ created, errors });
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
    if (c === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}
