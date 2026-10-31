import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite, requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { setDefaultWarehouse } from "@/lib/warehouses";

async function getOwned(id: string, companyId: string) {
  return prisma.warehouse.findFirst({ where: { id, companyId } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    code?: string;
    address?: string | null;
    active?: boolean;
  } = {};

  if (body.name != null) data.name = String(body.name).trim();
  if (body.code != null) data.code = String(body.code).trim().toUpperCase();
  if (body.address !== undefined) {
    data.address = body.address ? String(body.address).trim() : null;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);

  try {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data,
    });
    if (body.isDefault === true) {
      await setDefaultWarehouse(session.companyId, id);
    }
    await writeAudit({
      action: "UPDATE_WAREHOUSE",
      entityType: "Warehouse",
      entityId: id,
      details: data,
    });
    return NextResponse.json(
      await getOwned(id, session.companyId)
    );
  } catch {
    return NextResponse.json({ error: "לא ניתן לעדכן (קוד כפול?)" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  const locCount = await prisma.warehouseLocation.count({
    where: { warehouseId: id },
  });
  if (locCount > 0) {
    return NextResponse.json(
      { error: "לא ניתן למחוק מחסן עם מיקומים — העבירו או מחקו מיקומים קודם" },
      { status: 400 }
    );
  }

  const total = await prisma.warehouse.count({
    where: { companyId: session.companyId },
  });
  if (total <= 1) {
    return NextResponse.json(
      { error: "חייבים להשאיר לפחות מחסן אחד" },
      { status: 400 }
    );
  }

  await prisma.warehouse.delete({ where: { id } });
  if (existing.isDefault) {
    const next = await prisma.warehouse.findFirst({
      where: { companyId: session.companyId, active: true },
      orderBy: { createdAt: "asc" },
    });
    if (next) await setDefaultWarehouse(session.companyId, next.id);
  }

  await writeAudit({
    action: "DELETE_WAREHOUSE",
    entityType: "Warehouse",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
