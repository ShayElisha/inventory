import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const docs = await prisma.stockDocument.findMany({
    where: {
      companyId: session.companyId,
      ...(type ? { type } : {}),
    },
    include: {
      salesOrder: { select: { id: true, number: true, customerName: true } },
      purchaseOrder: { select: { id: true, number: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(docs);
}
