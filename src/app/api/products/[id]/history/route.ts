import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const changes = await prisma.productChangeLog.findMany({
    where: { productId: id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(changes);
}
