import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  const changes = await prisma.productChangeLog.findMany({
    where: { productId: id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(changes);
}
