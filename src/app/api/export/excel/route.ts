import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSheetWorkbook, workbookToBuffer } from "@/lib/excel";
import { attributesLabel } from "@/lib/utils";
import { reasonLabel, unitLabel } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "catalog";

  if (type === "catalog") {
    const variants = await prisma.productVariant.findMany({
      include: {
        product: { include: { category: true, supplier: true } },
        location: true,
      },
      orderBy: { sku: "asc" },
    });
    const wb = await createSheetWorkbook(
      "קטלוג",
      [
        "SKU",
        "ברקוד",
        "מוצר",
        "קטגוריה",
        "יחידה",
        "מאפיינים",
        "מלאי",
        "מיקום",
        "עלות",
        "מכירה",
      ],
      variants.map((v) => [
        v.sku,
        v.barcode,
        v.product.title,
        v.product.category.name,
        unitLabel(v.product.unitOfMeasure),
        attributesLabel(v.attributes),
        v.quantityOnHand,
        v.location?.code ?? "",
        v.product.costPrice,
        v.product.sellingPrice,
      ])
    );
    const buf = await workbookToBuffer(wb);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="catalog.xlsx"',
      },
    });
  }

  const txns = await prisma.stockTransaction.findMany({
    include: { variant: { include: { product: true } } },
    orderBy: { timestamp: "desc" },
    take: 5000,
  });
  const wb = await createSheetWorkbook(
    "תנועות",
    ["תאריך", "סוג", "SKU", "מוצר", "שינוי", "יתרה", "סיבה", "קוד סיבה"],
    txns.map((t) => [
      t.timestamp.toISOString(),
      t.type,
      t.variant.sku,
      t.variant.product.title,
      t.quantityChanged,
      t.newQuantity,
      t.reason,
      reasonLabel(t.reasonCode),
    ])
  );
  const buf = await workbookToBuffer(wb);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="transactions.xlsx"',
    },
  });
}
