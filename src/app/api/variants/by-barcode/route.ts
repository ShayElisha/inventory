import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();
  if (!barcode) {
    return NextResponse.json({ error: "חסר ברקוד" }, { status: 400 });
  }

  const variant = await prisma.productVariant.findUnique({
    where: { barcode },
    include: {
      product: { include: { category: true } },
      location: true,
    },
  });

  if (!variant) {
    return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
  }

  return NextResponse.json(variant);
}
