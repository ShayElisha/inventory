import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const orders = await prisma.purchaseOrder.findMany({
    where: { companyId: session.companyId },
    include: {
      supplier: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const rows: (string | number)[][] = [];
  for (const o of orders) {
    for (const l of o.lines) {
      rows.push([
        o.number,
        o.status,
        o.supplier?.name ?? "",
        l.variant.sku,
        l.variant.product.title,
        l.qtyOrdered,
        l.qtyReceived,
        l.unitCost,
        o.invoiceNumber ?? "",
        o.createdAt.toISOString(),
      ]);
    }
  }

  const csv = toCsv(
    [
      "הזמנה",
      "סטטוס",
      "ספק",
      "SKU",
      "מוצר",
      "הוזמן",
      "נקלט",
      "עלות",
      "חשבונית",
      "תאריך",
    ],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="purchase-orders.csv"',
    },
  });
}
