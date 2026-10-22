import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], variants: [], locations: [], picks: [] });
  }

  const [products, variants, locations, picks] = await Promise.all([
    prisma.product.findMany({
      where: {
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
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { zone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
    }),
    prisma.pickList.findMany({
      where: { reference: { contains: q, mode: "insensitive" } },
      take: 8,
    }),
  ]);

  return NextResponse.json({ products, variants, locations, picks });
}
