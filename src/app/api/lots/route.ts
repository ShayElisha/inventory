import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertModuleApi } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const gate = await assertModuleApi("lots");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const expiring = req.nextUrl.searchParams.get("expiring") === "1";
  const days = Number(req.nextUrl.searchParams.get("days") || 30);
  const until = new Date();
  until.setDate(until.getDate() + days);

  const lots = await prisma.inventoryLot.findMany({
    where: {
      companyId: session.companyId,
      quantity: { gt: 0 },
      ...(expiring
        ? { expiryDate: { not: null, lte: until } }
        : {}),
    },
    include: {
      variant: { include: { product: true } },
      location: true,
    },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json(lots);
}
