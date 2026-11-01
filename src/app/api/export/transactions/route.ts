import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export";
import { getSession } from "@/lib/auth";
import { reasonLabel } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const companyId = session.companyId;

  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId },
    select: { id: true, code: true },
  });
  const locMap = new Map(locations.map((l) => [l.id, l.code]));

  const txns = await prisma.stockTransaction.findMany({
    where: { variant: { companyId } },
    include: {
      variant: { include: { product: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 10000,
  });

  const csv = toCsv(
    [
      "תאריך",
      "סוג",
      "SKU",
      "מוצר",
      "שינוי",
      "קודם",
      "יתרה",
      "סיבה",
      "קוד סיבה",
      "ממיקום",
      "למיקום",
      "הזמנת מכירה",
      "הזמנת רכש",
    ],
    txns.map((t) => [
      t.timestamp.toISOString(),
      t.type,
      t.variant.sku,
      t.variant.product.title,
      t.quantityChanged,
      t.previousQuantity,
      t.newQuantity,
      t.reason,
      reasonLabel(t.reasonCode),
      t.fromLocationId ? locMap.get(t.fromLocationId) ?? t.fromLocationId : "",
      t.toLocationId ? locMap.get(t.toLocationId) ?? t.toLocationId : "",
      t.salesOrderId ?? "",
      t.purchaseOrderId ?? "",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
