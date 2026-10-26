import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { applyStockChange, StockError } from "@/lib/stock";

async function findOwned(id: string, companyId: string) {
  return prisma.returnAuthorization.findFirst({
    where: { id, companyId },
    include: { lines: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("returns");
  if (gate.error) return gate.error;
  const session = gate.session!;
  const { id } = await params;

  const rma = await prisma.returnAuthorization.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      customer: true,
      salesOrder: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });
  if (!rma) {
    return NextResponse.json({ error: "החזרה לא נמצאה" }, { status: 404 });
  }
  return NextResponse.json(rma);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("returns");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "החזרה לא נמצאה" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status != null) data.status = String(body.status);
  if (body.reason !== undefined)
    data.reason = body.reason ? String(body.reason).trim() : null;
  if (body.reasonCode !== undefined)
    data.reasonCode = body.reasonCode ? String(body.reasonCode) : null;
  if (body.notes !== undefined)
    data.notes = body.notes ? String(body.notes).trim() : null;
  if (body.creditAmount !== undefined) {
    data.creditAmount =
      body.creditAmount != null && body.creditAmount !== ""
        ? Number(body.creditAmount)
        : null;
  }

  const rma = await prisma.returnAuthorization.update({
    where: { id },
    data,
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      customer: true,
    },
  });

  await writeAudit({
    action: "UPDATE_RMA",
    entityType: "ReturnAuthorization",
    entityId: id,
    userId: session.id,
    details: data,
  });
  return NextResponse.json(rma);
}

/** פעולות: receive | credit | cancel */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("returns");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "החזרה לא נמצאה" }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "cancel") {
    const rma = await prisma.returnAuthorization.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(rma);
  }

  if (action === "receive") {
    if (["CANCELLED", "CREDITED", "REJECTED"].includes(existing.status)) {
      return NextResponse.json(
        { error: "לא ניתן לקבל החזרה בסטטוס זה" },
        { status: 400 }
      );
    }
    const receipts: {
      lineId: string;
      quantity: number;
      condition?: string;
      restock?: boolean;
      locationId?: string;
    }[] = Array.isArray(body.lines) ? body.lines : [];

    const locationIds = [
      ...new Set(
        receipts
          .map((r) => r.locationId)
          .filter((x): x is string => Boolean(x))
      ),
    ];
    if (locationIds.length) {
      const locCount = await prisma.warehouseLocation.count({
        where: { id: { in: locationIds }, companyId: session.companyId },
      });
      if (locCount !== locationIds.length) {
        return NextResponse.json(
          { error: "מיקום לא שייך לחברה" },
          { status: 403 }
        );
      }
    }

    const results: { lineId: string; ok: boolean; error?: string }[] = [];

    for (const line of existing.lines) {
      const receipt = receipts.find((r) => r.lineId === line.id);
      const qty = receipt
        ? Math.max(0, Number(receipt.quantity) || 0)
        : Math.max(0, line.qtyRequested - line.qtyReceived);
      if (qty <= 0) continue;

      const restock = receipt?.restock ?? line.restock;
      const condition = receipt?.condition || line.condition;

      try {
        if (restock && condition !== "DAMAGED") {
          await applyStockChange({
            variantId: line.variantId,
            type: "INBOUND",
            quantityChanged: qty,
            reason: `החזרת לקוח ${existing.number}`,
            reasonCode: "RETURN",
            userId: session.id,
            companyId: session.companyId,
            locationId: receipt?.locationId || null,
            salesOrderId: existing.salesOrderId,
          });
        }
        await prisma.returnAuthorizationLine.update({
          where: { id: line.id },
          data: {
            qtyReceived: line.qtyReceived + qty,
            condition,
            restock,
          },
        });
        results.push({ lineId: line.id, ok: true });
      } catch (e) {
        results.push({
          lineId: line.id,
          ok: false,
          error: e instanceof StockError ? e.message : "שגיאה",
        });
      }
    }

    const rma = await prisma.returnAuthorization.update({
      where: { id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
      },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
        customer: true,
      },
    });

    await writeAudit({
      action: "RECEIVE_RMA",
      entityType: "ReturnAuthorization",
      entityId: id,
      userId: session.id,
      details: { results },
    });

    return NextResponse.json({ rma, results });
  }

  if (action === "credit") {
    const creditAmount = Number(body.creditAmount);
    const rma = await prisma.returnAuthorization.update({
      where: { id },
      data: {
        status: "CREDITED",
        creditAmount: Number.isFinite(creditAmount) ? creditAmount : null,
      },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
        customer: true,
      },
    });

    await prisma.stockDocument.create({
      data: {
        companyId: session.companyId,
        type: "CREDIT_NOTE",
        number: `CN-${Date.now().toString(36).toUpperCase()}`,
        salesOrderId: existing.salesOrderId,
        payloadJson: JSON.stringify({ rmaId: id, creditAmount }),
        subtotal: Number.isFinite(creditAmount) ? creditAmount : 0,
        vatAmount: 0,
        total: Number.isFinite(creditAmount) ? creditAmount : 0,
      },
    });

    await writeAudit({
      action: "CREDIT_RMA",
      entityType: "ReturnAuthorization",
      entityId: id,
      userId: session.id,
      details: { creditAmount },
    });

    return NextResponse.json(rma);
  }

  return NextResponse.json({ error: "פעולה לא נתמכת" }, { status: 400 });
}
