import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET() {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.customer.findMany({
    where: { companyId: session.companyId },
    include: {
      priceList: { select: { id: true, name: true } },
      _count: { select: { salesOrders: true, waitlistItems: true } },
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
    return NextResponse.json({ error: "שם לקוח חובה" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      companyId: session.companyId,
      name,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      address: body.address ? String(body.address).trim() : null,
      taxId: body.taxId ? String(body.taxId).trim() : null,
      creditLimit:
        body.creditLimit != null && body.creditLimit !== ""
          ? Number(body.creditLimit)
          : null,
      priceListId: body.priceListId || null,
      notes: body.notes ? String(body.notes).trim() : null,
      active: body.active !== false,
    },
  });

  await writeAudit({
    action: "CREATE_CUSTOMER",
    entityType: "Customer",
    entityId: customer.id,
    userId: session.id,
    details: { name: customer.name },
  });

  return NextResponse.json(customer, { status: 201 });
}
