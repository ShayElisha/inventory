import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveApiKey } from "@/lib/api-keys";

/** API ציבורי לאינטגרציות — Bearer sfira_… */
export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "API key לא תקין" }, { status: 401 });
  }

  const take = Math.min(
    200,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50)
  );
  const variants = await prisma.productVariant.findMany({
    where: { companyId: auth.companyId },
    select: {
      id: true,
      sku: true,
      barcode: true,
      quantityOnHand: true,
      quantityReserved: true,
      product: { select: { title: true } },
      balances: {
        select: {
          quantityOnHand: true,
          location: { select: { code: true } },
        },
      },
    },
    orderBy: { sku: "asc" },
    take,
  });

  return NextResponse.json({
    companyId: auth.companyId,
    items: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      title: v.product.title,
      onHand: v.quantityOnHand,
      reserved: v.quantityReserved,
      available: v.quantityOnHand - v.quantityReserved,
      locations: v.balances.map((b) => ({
        code: b.location.code,
        onHand: b.quantityOnHand,
      })),
    })),
  });
}
