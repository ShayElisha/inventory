import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertModuleApi } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const gate = await assertModuleApi("serials");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const serials = await prisma.serialNumber.findMany({
    where: {
      companyId: session.companyId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { serial: { contains: q, mode: "insensitive" } },
              { variant: { sku: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      variant: { include: { product: true } },
      location: true,
      lot: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json(serials);
}
