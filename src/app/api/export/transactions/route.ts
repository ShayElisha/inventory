import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export";

export async function GET() {
  const txns = await prisma.stockTransaction.findMany({
    include: {
      variant: { include: { product: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  const csv = toCsv(
    [
      "Timestamp",
      "Type",
      "SKU",
      "Product",
      "QtyChanged",
      "PreviousQty",
      "NewQty",
      "Reason",
      "FromLocation",
      "ToLocation",
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
      t.fromLocationId ?? "",
      t.toLocationId ?? "",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
