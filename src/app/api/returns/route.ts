import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import {
  assertVariantsOwned,
  forbiddenTenant,
} from "@/lib/tenant-guard";

export async function GET() {
  const gate = await assertModuleApi("returns");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.returnAuthorization.findMany({
    where: { companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true } },
      salesOrder: { select: { id: true, number: true } },
      lines: {
        include: { variant: { include: { product: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("returns");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "הוסיפו לפחות שורה" }, { status: 400 });
  }

  const variantIds = items.map((i: { variantId?: string }) =>
    String(i.variantId || "")
  );
  if (!(await assertVariantsOwned(session.companyId, variantIds))) {
    return forbiddenTenant();
  }

  if (body.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: String(body.customerId), companyId: session.companyId },
    });
    if (!customer) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 400 });
    }
  }
  if (body.salesOrderId) {
    const order = await prisma.salesOrder.findFirst({
      where: { id: String(body.salesOrderId), companyId: session.companyId },
    });
    if (!order) {
      return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 400 });
    }
  }

  const number =
    String(body.number || "").trim() ||
    `RA-${Date.now().toString(36).toUpperCase()}`;

  const rma = await prisma.returnAuthorization.create({
    data: {
      companyId: session.companyId,
      number,
      customerId: body.customerId || null,
      salesOrderId: body.salesOrderId || null,
      reason: body.reason ? String(body.reason).trim() : null,
      reasonCode: body.reasonCode ? String(body.reasonCode) : null,
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      lines: {
        create: items.map(
          (i: {
            variantId: string;
            qtyRequested: number;
            condition?: string;
            restock?: boolean;
            notes?: string;
          }) => ({
            variantId: String(i.variantId),
            qtyRequested: Math.max(1, Number(i.qtyRequested) || 1),
            condition: i.condition || "UNKNOWN",
            restock: i.restock !== false,
            notes: i.notes ? String(i.notes) : null,
          })
        ),
      },
    },
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      customer: true,
      salesOrder: true,
    },
  });

  await writeAudit({
    action: "CREATE_RMA",
    entityType: "ReturnAuthorization",
    entityId: rma.id,
    userId: session.id,
    details: { number: rma.number },
  });

  return NextResponse.json(rma, { status: 201 });
}
