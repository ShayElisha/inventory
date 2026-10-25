import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("shipments");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.shipment.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "משלוח לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  const statusMap: Record<string, { status: string; extra?: object }> = {
    pack: { status: "PACKED" },
    ship: {
      status: "SHIPPED",
      extra: {
        shippedAt: new Date(),
        carrier: body.carrier ?? existing.carrier,
        trackingRef: body.trackingRef ?? existing.trackingRef,
      },
    },
    deliver: { status: "DELIVERED", extra: { deliveredAt: new Date() } },
    cancel: { status: "CANCELLED" },
  };

  const mapped = statusMap[action];
  if (!mapped) {
    return NextResponse.json({ error: "פעולה לא נתמכת" }, { status: 400 });
  }

  const shipment = await prisma.shipment.update({
    where: { id },
    data: { status: mapped.status, ...(mapped.extra || {}) },
    include: {
      packages: {
        include: {
          items: { include: { variant: { include: { product: true } } } },
        },
      },
      salesOrder: true,
    },
  });

  if (action === "ship" || action === "pack") {
    await prisma.salesOrder.update({
      where: { id: existing.salesOrderId },
      data: {
        status: action === "ship" ? "SHIPPED" : "PACKED",
        shippingCarrier: shipment.carrier,
        shippingRef: shipment.trackingRef,
      },
    });
  }

  await writeAudit({
    action: `SHIPMENT_${action.toUpperCase()}`,
    entityType: "Shipment",
    entityId: id,
    userId: session.id,
  });

  return NextResponse.json(shipment);
}
