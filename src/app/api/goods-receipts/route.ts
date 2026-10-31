import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertModuleApi } from "@/lib/tenant";

export async function GET() {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.goodsReceipt.findMany({
    where: { companyId: session.companyId },
    include: {
      purchaseOrder: { select: { id: true, number: true } },
      lines: {
        include: { variant: { include: { product: { select: { title: true } } } } },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(list);
}
