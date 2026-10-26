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
  const gate = await assertModuleApi("shipments");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.shipment.findMany({
    where: { companyId: session.companyId },
    include: {
      salesOrder: { select: { id: true, number: true, customerName: true } },
      packages: {
        include: {
          items: { include: { variant: { include: { product: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("shipments");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const salesOrderId = String(body.salesOrderId || "");
  if (!salesOrderId) {
    return NextResponse.json({ error: "הזמנה חובה" }, { status: 400 });
  }
  const order = await prisma.salesOrder.findFirst({
    where: { id: salesOrderId, companyId: session.companyId },
    include: { lines: true },
  });
  if (!order) {
    return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  }

  const number =
    String(body.number || "").trim() ||
    `SH-${Date.now().toString(36).toUpperCase()}`;

  const packageItems = Array.isArray(body.items)
    ? body.items
    : order.lines.map((l) => ({
        variantId: l.variantId,
        quantity: Math.max(0, l.qtyOrdered - l.qtyFulfilled) || l.qtyOrdered,
      }));

  const variantIds = packageItems
    .filter((i: { variantId?: string; quantity?: number }) => i.variantId)
    .map((i: { variantId: string }) => String(i.variantId));
  if (
    variantIds.length &&
    !(await assertVariantsOwned(session.companyId, variantIds))
  ) {
    return forbiddenTenant();
  }

  const shipment = await prisma.shipment.create({
    data: {
      companyId: session.companyId,
      salesOrderId,
      number,
      carrier: body.carrier ? String(body.carrier).trim() : null,
      trackingRef: body.trackingRef ? String(body.trackingRef).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      packages: {
        create: [
          {
            label: body.packageLabel || "חבילה 1",
            weightKg: body.weightKg != null ? Number(body.weightKg) : null,
            trackingRef: body.trackingRef
              ? String(body.trackingRef).trim()
              : null,
            items: {
              create: packageItems
                .filter((i: { variantId?: string; quantity?: number }) =>
                  i.variantId && Number(i.quantity) > 0
                )
                .map((i: { variantId: string; quantity: number }) => ({
                  variantId: String(i.variantId),
                  quantity: Math.max(1, Number(i.quantity) || 1),
                })),
            },
          },
        ],
      },
    },
    include: {
      packages: {
        include: {
          items: { include: { variant: { include: { product: true } } } },
        },
      },
      salesOrder: true,
    },
  });

  await writeAudit({
    action: "CREATE_SHIPMENT",
    entityType: "Shipment",
    entityId: shipment.id,
    userId: session.id,
    details: { number: shipment.number },
  });

  return NextResponse.json(shipment, { status: 201 });
}
