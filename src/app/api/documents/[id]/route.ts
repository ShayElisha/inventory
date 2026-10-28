import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const { id } = await params;
  const doc = await prisma.stockDocument.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      salesOrder: {
        select: {
          id: true,
          number: true,
          customerName: true,
          shippingCarrier: true,
          shippingRef: true,
        },
      },
      purchaseOrder: { select: { id: true, number: true } },
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }
  return NextResponse.json(doc);
}
