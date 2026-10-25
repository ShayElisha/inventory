import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET() {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.priceList.findMany({
    where: { companyId: session.companyId },
    include: {
      _count: { select: { items: true, customers: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "שם מחירון חובה" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const priceList = await prisma.priceList.create({
    data: {
      companyId: session.companyId,
      name,
      currency: body.currency ? String(body.currency).trim() : "ILS",
      active: body.active !== false,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validTo: body.validTo ? new Date(body.validTo) : null,
      items: {
        create: items
          .filter((i: { variantId?: string }) => i.variantId)
          .map(
            (i: {
              variantId: string;
              unitPrice: number;
              minQty?: number;
            }) => ({
              variantId: String(i.variantId),
              unitPrice: Number(i.unitPrice) || 0,
              minQty: Math.max(1, Number(i.minQty) || 1),
            })
          ),
      },
    },
    include: { items: true },
  });

  await writeAudit({
    action: "CREATE_PRICE_LIST",
    entityType: "PriceList",
    entityId: priceList.id,
    userId: session.id,
    details: { name: priceList.name },
  });

  return NextResponse.json(priceList, { status: 201 });
}
