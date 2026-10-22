import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const queue = req.nextUrl.searchParams.get("queue") === "1";
  const list = await prisma.salesOrder.findMany({
    where: {
      companyId: session.companyId,
      ...(queue
        ? { status: { in: ["OPEN", "PARTIAL", "FULFILLED", "PACKED"] } }
        : {}),
    },
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      _count: { select: { lines: true } },
    },
    orderBy: queue
      ? [{ priority: "asc" }, { slaDueAt: "asc" }, { createdAt: "asc" }]
      : { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const customerName = String(body.customerName || "").trim();
  if (!customerName) {
    return NextResponse.json({ error: "שם לקוח חובה" }, { status: 400 });
  }
  const number =
    String(body.number || "").trim() ||
    `SO-${Date.now().toString(36).toUpperCase()}`;
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "הוסיפו לפחות שורה" }, { status: 400 });
  }

  const variantIds = items.map((i: { variantId: string }) => String(i.variantId));
  const owned = await prisma.productVariant.count({
    where: { id: { in: variantIds }, product: { companyId: session.companyId } },
  });
  if (owned !== variantIds.length) {
    return NextResponse.json({ error: "יש פריטים שאינם שייכים לחברה" }, { status: 400 });
  }

  const order = await prisma.salesOrder.create({
    data: {
      companyId: session.companyId,
      number,
      customerName,
      customerPhone: body.customerPhone
        ? String(body.customerPhone).trim()
        : null,
      priority: Math.min(5, Math.max(1, Number(body.priority) || 3)),
      slaDueAt: body.slaDueAt ? new Date(body.slaDueAt) : null,
      vatRate: Number(body.vatRate) >= 0 ? Number(body.vatRate) : 17,
      discountTiers: body.discountTiers
        ? JSON.stringify(body.discountTiers)
        : "[]",
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      lines: {
        create: items.map(
          (it: {
            variantId: string;
            quantity: number;
            unitPrice?: number;
          }) => ({
            variantId: String(it.variantId),
            qtyOrdered: Math.max(1, Number(it.quantity) || 1),
            unitPrice: Number(it.unitPrice) || 0,
          })
        ),
      },
    },
    include: {
      lines: { include: { variant: { include: { product: true } } } },
    },
  });

  await writeAudit({
    action: "CREATE_SO",
    entityType: "SalesOrder",
    entityId: order.id,
    details: { number: order.number, customerName },
  });

  return NextResponse.json(order, { status: 201 });
}
