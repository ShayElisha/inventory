import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { applyStockChange, StockError } from "@/lib/stock";

async function findOwned(id: string, companyId: string) {
  return prisma.stockTransfer.findFirst({
    where: { id, companyId },
    include: { lines: true },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("transfers");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "העברה לא נמצאה" }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "cancel") {
    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(transfer);
  }

  if (action === "ship") {
    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "ניתן לשלוח רק מטיוטה" }, { status: 400 });
    }
    try {
      for (const line of existing.lines) {
        const qty = line.qtyRequested;
        await applyStockChange({
          variantId: line.variantId,
          type: "OUTBOUND",
          quantityChanged: qty,
          reason: `העברה ${existing.number} — יציאה`,
          reasonCode: "TRANSFER_OUT",
          userId: session.id,
          companyId: session.companyId,
          fromLocationId: line.fromLocationId,
          locationId: line.fromLocationId,
        });
        await prisma.stockTransferLine.update({
          where: { id: line.id },
          data: { qtyShipped: qty },
        });
      }
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof StockError ? e.message : "שגיאה במשלוח" },
        { status: 400 }
      );
    }
    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: { status: "IN_TRANSIT", shippedAt: new Date() },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
        fromWarehouse: true,
        toWarehouse: true,
      },
    });
    await writeAudit({
      action: "SHIP_TRANSFER",
      entityType: "StockTransfer",
      entityId: id,
      userId: session.id,
    });
    return NextResponse.json(transfer);
  }

  if (action === "receive") {
    if (existing.status !== "IN_TRANSIT") {
      return NextResponse.json(
        { error: "ניתן לקבל רק העברה בדרך" },
        { status: 400 }
      );
    }
    try {
      for (const line of existing.lines) {
        const qty = line.qtyShipped || line.qtyRequested;
        await applyStockChange({
          variantId: line.variantId,
          type: "INBOUND",
          quantityChanged: qty,
          reason: `העברה ${existing.number} — כניסה`,
          reasonCode: "TRANSFER_IN",
          userId: session.id,
          companyId: session.companyId,
          toLocationId: line.toLocationId,
          locationId: line.toLocationId,
        });
        await prisma.stockTransferLine.update({
          where: { id: line.id },
          data: { qtyReceived: qty },
        });
      }
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof StockError ? e.message : "שגיאה בקבלה" },
        { status: 400 }
      );
    }
    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
        fromWarehouse: true,
        toWarehouse: true,
      },
    });
    await writeAudit({
      action: "RECEIVE_TRANSFER",
      entityType: "StockTransfer",
      entityId: id,
      userId: session.id,
    });
    return NextResponse.json(transfer);
  }

  return NextResponse.json({ error: "פעולה לא נתמכת" }, { status: 400 });
}
