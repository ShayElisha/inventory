import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { applyStockChange, StockError } from "@/lib/stock";
import { poStatusAfterReceive } from "@/lib/commerce";

async function getOwned(id: string, companyId: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, companyId },
    include: {
      supplier: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;
  const { id } = await params;
  const po = await getOwned(id, session.companyId);
  if (!po) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const po = await getOwned(id, session.companyId);
  if (!po) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const body = await req.json();
  const data: {
    invoiceNumber?: string | null;
    notes?: string | null;
    status?: string;
    supplierId?: string | null;
  } = {};
  if (body.invoiceNumber !== undefined) {
    data.invoiceNumber = body.invoiceNumber
      ? String(body.invoiceNumber).trim()
      : null;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }
  if (body.status !== undefined) data.status = String(body.status);
  if (body.supplierId !== undefined) {
    if (body.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: String(body.supplierId), companyId: session.companyId },
      });
      if (!supplier) {
        return NextResponse.json({ error: "ספק לא שייך לחברה" }, { status: 403 });
      }
    }
    data.supplierId = body.supplierId || null;
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data,
    include: {
      supplier: true,
      lines: { include: { variant: { include: { product: true } } } },
    },
  });
  return NextResponse.json(updated);
}

/**
 * קליטה מול PO — תומך בקליטה חלקית, פיצול למיקומים, אצווה+תוקף
 * body.receipts: [{ lineId, quantity, locationId?, lotCode?, expiryDate?, serials?[] }]
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const po = await getOwned(id, session.companyId);
  if (!po) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (po.status === "CANCELLED" || po.status === "RECEIVED") {
    return NextResponse.json({ error: "לא ניתן לקלוט להזמנה זו" }, { status: 400 });
  }

  const body = await req.json();
  const receipts: {
    lineId: string;
    quantity: number;
    locationId?: string;
    lotCode?: string;
    expiryDate?: string;
    serials?: string[];
  }[] = Array.isArray(body.receipts) ? body.receipts : [];

  if (!receipts.length) {
    return NextResponse.json({ error: "אין שורות קליטה" }, { status: 400 });
  }

  const locationIds = receipts.map((r) => r.locationId).filter(Boolean) as string[];
  if (locationIds.length) {
    const locCount = await prisma.warehouseLocation.count({
      where: { id: { in: locationIds }, companyId: session.companyId },
    });
    if (locCount !== [...new Set(locationIds)].length) {
      return NextResponse.json({ error: "מיקום לא שייך לחברה" }, { status: 403 });
    }
  }

  const results: { lineId: string; ok: boolean; error?: string }[] = [];

  for (const r of receipts) {
    const line = po.lines.find((l) => l.id === r.lineId);
    if (!line) {
      results.push({ lineId: r.lineId, ok: false, error: "שורה לא נמצאה" });
      continue;
    }
    const qty = Math.max(0, Number(r.quantity) || 0);
    if (qty <= 0) {
      results.push({ lineId: r.lineId, ok: false, error: "כמות לא תקינה" });
      continue;
    }
    const remaining = line.qtyOrdered - line.qtyReceived;
    if (qty > remaining) {
      results.push({
        lineId: r.lineId,
        ok: false,
        error: `נותרו לקליטה רק ${remaining}`,
      });
      continue;
    }

    try {
      const serials = Array.isArray(r.serials) ? r.serials.filter(Boolean) : [];
      if (serials.length && serials.length !== qty) {
        throw new StockError("מספר סידורי חייב להתאים לכמות");
      }
      if (serials.length) {
        for (const s of serials) {
          await applyStockChange({
            variantId: line.variantId,
            type: "INBOUND",
            quantityChanged: 1,
            reason: `קליטה מ־PO ${po.number}`,
            reasonCode: "PO_RECEIVE",
            userId: session.id,
            companyId: session.companyId,
            locationId: r.locationId || null,
            lotCode: r.lotCode || null,
            expiryDate: r.expiryDate || null,
            serial: s,
            purchaseOrderId: po.id,
          });
        }
      } else {
        await applyStockChange({
          variantId: line.variantId,
          type: "INBOUND",
          quantityChanged: qty,
          reason: `קליטה מ־PO ${po.number}`,
          reasonCode: "PO_RECEIVE",
          userId: session.id,
          companyId: session.companyId,
          locationId: r.locationId || null,
          lotCode: r.lotCode || null,
          expiryDate: r.expiryDate || null,
          purchaseOrderId: po.id,
        });
      }

      await prisma.purchaseOrderLine.update({
        where: { id: line.id },
        data: { qtyReceived: line.qtyReceived + qty },
      });
      line.qtyReceived += qty;
      results.push({ lineId: r.lineId, ok: true });
    } catch (e) {
      results.push({
        lineId: r.lineId,
        ok: false,
        error: e instanceof StockError ? e.message : "שגיאה בקליטה",
      });
    }
  }

  const fresh = await getOwned(id, session.companyId);
  if (fresh) {
    const ordered = fresh.lines.reduce((s, l) => s + l.qtyOrdered, 0);
    const received = fresh.lines.reduce((s, l) => s + l.qtyReceived, 0);
    const status = poStatusAfterReceive(ordered, received);
    await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        invoiceNumber: body.invoiceNumber
          ? String(body.invoiceNumber).trim()
          : fresh.invoiceNumber,
      },
    });
  }

  await writeAudit({
    action: "RECEIVE_PO",
    entityType: "PurchaseOrder",
    entityId: id,
    details: {
      number: po.number,
      ok: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
    },
  });

  const updated = await getOwned(id, session.companyId);
  return NextResponse.json({ po: updated, results });
}
