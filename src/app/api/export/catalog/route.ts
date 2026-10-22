import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export";
import { attributesLabel } from "@/lib/utils";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const variants = await prisma.productVariant.findMany({
    where: { product: { companyId: session.companyId } },
    include: {
      product: { include: { category: true, supplier: true } },
      location: true,
    },
    orderBy: { sku: "asc" },
  });

  const csv = toCsv(
    [
      "SKU",
      "Barcode",
      "Product",
      "Category",
      "Supplier",
      "Attributes",
      "QtyOnHand",
      "QtyReserved",
      "MinAlert",
      "Location",
      "CostPrice",
      "SellingPrice",
    ],
    variants.map((v) => [
      v.sku,
      v.barcode,
      v.product.title,
      v.product.category.name,
      v.product.supplier?.name ?? "",
      attributesLabel(v.attributes),
      v.quantityOnHand,
      v.quantityReserved,
      v.minAlertLevel,
      v.location?.code ?? "",
      v.product.costPrice,
      v.product.sellingPrice,
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="catalog.csv"',
    },
  });
}
