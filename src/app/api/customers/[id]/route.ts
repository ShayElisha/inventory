import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import {
  assertPriceListOwned,
  forbiddenTenant,
} from "@/lib/tenant-guard";

async function findOwned(id: string, companyId: string) {
  return prisma.customer.findFirst({ where: { id, companyId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      priceList: true,
      customerPrices: { include: { variant: { include: { product: true } } } },
      salesOrders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          number: true,
          status: true,
          createdAt: true,
          customerName: true,
        },
      },
    },
  });
  if (!customer) {
    return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
  }
  return NextResponse.json(customer);
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
    return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "שם לקוח חובה" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.phone !== undefined)
    data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.email !== undefined)
    data.email = body.email ? String(body.email).trim() : null;
  if (body.address !== undefined)
    data.address = body.address ? String(body.address).trim() : null;
  if (body.taxId !== undefined)
    data.taxId = body.taxId ? String(body.taxId).trim() : null;
  if (body.notes !== undefined)
    data.notes = body.notes ? String(body.notes).trim() : null;
  if (body.creditLimit !== undefined) {
    data.creditLimit =
      body.creditLimit != null && body.creditLimit !== ""
        ? Number(body.creditLimit)
        : null;
  }
  if (body.priceListId !== undefined) {
    if (!(await assertPriceListOwned(session.companyId, body.priceListId))) {
      return forbiddenTenant("מחירון לא שייך לחברה");
    }
    data.priceListId = body.priceListId || null;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  const customer = await prisma.customer.update({ where: { id }, data });
  await writeAudit({
    action: "UPDATE_CUSTOMER",
    entityType: "Customer",
    entityId: id,
    userId: session.id,
    details: data,
  });
  return NextResponse.json(customer);
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
    return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
  }

  await prisma.customer.update({
    where: { id },
    data: { active: false },
  });
  await writeAudit({
    action: "DEACTIVATE_CUSTOMER",
    entityType: "Customer",
    entityId: id,
    userId: session.id,
  });
  return NextResponse.json({ ok: true });
}
