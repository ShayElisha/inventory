import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim();
  if (!barcode) {
    return NextResponse.json({ error: "חסר ברקוד" }, { status: 400 });
  }

  const variant = await prisma.productVariant.findFirst({
    where: { barcode, product: { companyId: session.companyId } },
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
