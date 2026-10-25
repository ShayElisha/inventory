import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

async function findOwned(id: string, companyId: string) {
  return prisma.priceList.findFirst({ where: { id, companyId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  const { id } = await params;

  const priceList = await prisma.priceList.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      items: {
        include: { variant: { include: { product: true } } },
        orderBy: { minQty: "asc" },
      },
      customers: { select: { id: true, name: true } },
    },
  });
  if (!priceList) {
    return NextResponse.json({ error: "מחירון לא נמצא" }, { status: 404 });
  }
  return NextResponse.json(priceList);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "מחירון לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "שם מחירון חובה" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.currency !== undefined)
    data.currency = String(body.currency || "ILS").trim();
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.validFrom !== undefined) {
    data.validFrom = body.validFrom ? new Date(body.validFrom) : null;
  }
  if (body.validTo !== undefined) {
    data.validTo = body.validTo ? new Date(body.validTo) : null;
  }

  if (Array.isArray(body.items)) {
    await prisma.$transaction([
      prisma.priceListItem.deleteMany({ where: { priceListId: id } }),
      prisma.priceList.update({
        where: { id },
        data: {
          ...data,
          items: {
            create: body.items
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
      }),
    ]);
  } else {
    await prisma.priceList.update({ where: { id }, data });
  }

  const priceList = await prisma.priceList.findUnique({
    where: { id },
    include: { items: true },
  });

  await writeAudit({
    action: "UPDATE_PRICE_LIST",
    entityType: "PriceList",
    entityId: id,
    userId: session.id,
    details: data,
  });
  return NextResponse.json(priceList);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "מחירון לא נמצא" }, { status: 404 });
  }

  await prisma.priceList.update({
    where: { id },
    data: { active: false },
  });
  await writeAudit({
    action: "DEACTIVATE_PRICE_LIST",
    entityType: "PriceList",
    entityId: id,
    userId: session.id,
  });
  return NextResponse.json({ ok: true });
}
