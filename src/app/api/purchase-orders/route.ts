import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET() {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.purchaseOrder.findMany({
    where: { companyId: session.companyId },
    include: {
      supplier: true,
      lines: { include: { variant: { include: { product: true } } } },
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const number =
    String(body.number || "").trim() ||
    `PO-${Date.now().toString(36).toUpperCase()}`;
  const supplierId = body.supplierId || null;
  const invoiceNumber = body.invoiceNumber
    ? String(body.invoiceNumber).trim()
    : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const expectedAt = body.expectedAt ? new Date(body.expectedAt) : null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!items.length) {
    return NextResponse.json({ error: "הוסיפו לפחות שורה אחת" }, { status: 400 });
  }

  const variantIds = items.map((i: { variantId: string }) => String(i.variantId));
  const owned = await prisma.productVariant.count({
    where: { id: { in: variantIds }, product: { companyId: session.companyId } },
  });
  if (owned !== variantIds.length) {
    return NextResponse.json({ error: "יש פריטים שאינם שייכים לחברה" }, { status: 400 });
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      companyId: session.companyId,
      supplierId,
      number,
      status: "ORDERED",
      invoiceNumber,
      notes,
      expectedAt,
      createdById: session.id,
      lines: {
        create: items.map(
          (it: { variantId: string; quantity: number; unitCost?: number }) => ({
            variantId: String(it.variantId),
            qtyOrdered: Math.max(1, Number(it.quantity) || 1),
            unitCost: Number(it.unitCost) || 0,
          })
        ),
      },
    },
    include: {
      supplier: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });

  await writeAudit({
    action: "CREATE_PO",
    entityType: "PurchaseOrder",
    entityId: po.id,
    details: { number: po.number, lines: items.length },
  });

  return NextResponse.json(po, { status: 201 });
}
