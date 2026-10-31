import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite, requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ensureDefaultWarehouse, setDefaultWarehouse } from "@/lib/warehouses";

export async function GET() {
  const session = await requireSession();
  await ensureDefaultWarehouse(session.companyId);
  const warehouses = await prisma.warehouse.findMany({
    where: { companyId: session.companyId },
    include: { _count: { select: { locations: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(warehouses);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const code = String(body.code || "")
    .trim()
    .toUpperCase();
  if (!name || !code) {
    return NextResponse.json({ error: "שם וקוד חובה" }, { status: 400 });
  }

  await ensureDefaultWarehouse(session.companyId);

  const count = await prisma.warehouse.count({
    where: { companyId: session.companyId },
  });
  const makeDefault = Boolean(body.isDefault) || count === 0;

  try {
    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: session.companyId,
        name,
        code,
        address: body.address ? String(body.address).trim() : null,
        isDefault: makeDefault,
        active: body.active === false ? false : true,
      },
    });
    if (makeDefault) {
      await setDefaultWarehouse(session.companyId, warehouse.id);
    }
    await writeAudit({
      action: "CREATE_WAREHOUSE",
      entityType: "Warehouse",
      entityId: warehouse.id,
      details: { name, code },
    });
    return NextResponse.json(warehouse, { status: 201 });
  } catch {
    return NextResponse.json({ error: "קוד מחסן כבר קיים" }, { status: 400 });
  }
}
