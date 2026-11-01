import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import {
  assertCustomerCredit,
  CreditError,
  orderLinesTotal,
} from "@/lib/credit";
import { checkAtp } from "@/lib/atp";
import { assertPermission } from "@/lib/require-permission";

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
      customer: { select: { id: true, name: true, creditLimit: true } },
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
  const perm = await assertPermission(session, "sales.write");
  if (!perm.ok) return perm.error;

  const body = await req.json();
  let customerId =
    body.customerId != null && body.customerId !== ""
      ? String(body.customerId)
      : null;
  let customerName = String(body.customerName || "").trim();
  let customerPhone = body.customerPhone
    ? String(body.customerPhone).trim()
    : null;

  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: session.companyId },
    });
    if (!customer) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 400 });
    }
    customerName = customer.name;
    if (!customerPhone) customerPhone = customer.phone;
  }

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

  const vatRate = Number(body.vatRate) >= 0 ? Number(body.vatRate) : 17;
  const lineRows: {
    variantId: string;
    qtyOrdered: number;
    unitPrice: number;
  }[] = items.map(
    (it: { variantId: string; quantity: number; unitPrice?: number }) => ({
      variantId: String(it.variantId),
      qtyOrdered: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Number(it.unitPrice) || 0,
    })
  );

  if (customerId) {
    try {
      await assertCustomerCredit({
        companyId: session.companyId,
        customerId,
        additionalAmount: orderLinesTotal(lineRows, vatRate),
      });
    } catch (e) {
      if (e instanceof CreditError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }

  const atp = await checkAtp(
    session.companyId,
    lineRows.map((l) => ({ variantId: l.variantId, quantity: l.qtyOrdered }))
  );
  if (!atp.ok && !body.forceAtp && !body.ignoreAtp) {
    return NextResponse.json(
      {
        error: "אין מספיק מלאי זמין (ATP) לחלק מהפריטים",
        code: "ATP_SHORTFALL",
        atp,
      },
      { status: 409 }
    );
  }

  const order = await prisma.salesOrder.create({
    data: {
      companyId: session.companyId,
      number,
      customerId,
      customerName,
      customerPhone,
      priority: Math.min(5, Math.max(1, Number(body.priority) || 3)),
      slaDueAt: body.slaDueAt ? new Date(body.slaDueAt) : null,
      vatRate,
      discountTiers: body.discountTiers
        ? JSON.stringify(body.discountTiers)
        : "[]",
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      lines: {
        create: lineRows,
      },
    },
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      customer: { select: { id: true, name: true, creditLimit: true } },
    },
  });

  await writeAudit({
    action: "CREATE_SO",
    entityType: "SalesOrder",
    entityId: order.id,
    details: { number: order.number, customerName, customerId },
  });

  void import("@/lib/webhooks-dispatch").then(({ dispatchWebhooks }) =>
    dispatchWebhooks(session.companyId, "order.created", {
      id: order.id,
      number: order.number,
      customerName: order.customerName,
    })
  );

  return NextResponse.json(
    { ...order, atpWarning: atp.ok ? null : atp },
    { status: 201 }
  );
}
