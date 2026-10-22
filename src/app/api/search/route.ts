import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const companyId = session.companyId;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], variants: [], locations: [], picks: [] });
  }

  const [products, variants, locations, picks] = await Promise.all([
    prisma.product.findMany({
      where: {
        companyId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { baseSku: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      include: { category: true },
    }),
    prisma.productVariant.findMany({
      where: {
        product: { companyId },
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q } },
          { product: { title: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 15,
      include: { product: true, location: true },
    }),
    prisma.warehouseLocation.findMany({
      where: {
        companyId,
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { zone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
    }),
    prisma.pickList.findMany({
      where: {
        companyId,
        reference: { contains: q, mode: "insensitive" },
      },
      take: 8,
    }),
  ]);

  return NextResponse.json({ products, variants, locations, picks });
}
