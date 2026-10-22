import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** חיפוש לפי ברקוד, מק״ט או שם מוצר */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const companyId = session.companyId;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "חסר קוד או שם" }, { status: 400 });
  }

  const exact = await prisma.productVariant.findFirst({
    where: {
      product: { companyId },
      OR: [
        { barcode: q },
        { sku: q },
        { sku: { equals: q.toUpperCase() } },
      ],
    },
    include: {
      product: { include: { category: true } },
      location: true,
    },
  });

  if (exact) {
    return NextResponse.json({ match: "exact", variants: [exact] });
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      product: { companyId },
      OR: [
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { product: { title: { contains: q } } },
        { product: { baseSku: { contains: q } } },
      ],
    },
    include: {
      product: { include: { category: true } },
      location: true,
    },
    orderBy: [{ product: { title: "asc" } }, { sku: "asc" }],
    take: 25,
  });

  if (variants.length === 0) {
    return NextResponse.json({ error: "לא נמצאו מוצרים" }, { status: 404 });
  }

  return NextResponse.json({
    match: variants.length === 1 ? "exact" : "multi",
    variants,
  });
}
