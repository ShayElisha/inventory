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
 * קליטה מול PO — יוצרת GoodsReceipt + מעלה מלאי תקין בלבד
 * body.receipts: [{ lineId, quantity, qtyDamaged?, locationId?, lotCode?, expiryDate?, serials?[] }]
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
    qtyDamaged?: number;
    locationId?: string;
    lotCode?: string;
    expiryDate?: string;
    serials?: string[];
    notes?: string;
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

  const results: {
    lineId: string;
    ok: boolean;
    error?: string;
    qtyReceived?: number;
    qtyDamaged?: number;
  }[] = [];
  const grLines: {
    poLineId: string;
    variantId: string;
    qtyExpected: number;
    qtyReceived: number;
    qtyDamaged: number;
    notes: string | null;
  }[] = [];

  for (const r of receipts) {
    const line = po.lines.find((l) => l.id === r.lineId);
    if (!line) {
      results.push({ lineId: r.lineId, ok: false, error: "שורה לא נמצאה" });
      continue;
    }
    const qtyGood = Math.max(0, Number(r.quantity) || 0);
    const qtyDamaged = Math.max(0, Number(r.qtyDamaged) || 0);
    if (qtyGood <= 0 && qtyDamaged <= 0) {
      results.push({ lineId: r.lineId, ok: false, error: "כמות לא תקינה" });
      continue;
    }
    const remaining = line.qtyOrdered - line.qtyReceived;
    const againstPo = qtyGood + qtyDamaged;
    if (againstPo > remaining) {
      results.push({
        lineId: r.lineId,
        ok: false,
        error: `נותרו לקליטה רק ${remaining}`,
      });
      continue;
    }

    try {
      if (qtyGood > 0) {
        const serials = Array.isArray(r.serials) ? r.serials.filter(Boolean) : [];
        if (serials.length && serials.length !== qtyGood) {
          throw new StockError("מספר סידורי חייב להתאים לכמות התקינה");
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
            quantityChanged: qtyGood,
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
      }

      // qtyReceived על שורת PO = תקין + נזק (כנגד ההזמנה); רק תקין נכנס למלאי
      await prisma.purchaseOrderLine.update({
        where: { id: line.id },
        data: { qtyReceived: line.qtyReceived + againstPo },
      });
      line.qtyReceived += againstPo;
      grLines.push({
        poLineId: line.id,
        variantId: line.variantId,
        qtyExpected: remaining,
        qtyReceived: qtyGood,
        qtyDamaged,
        notes: r.notes
          ? String(r.notes)
          : qtyDamaged
            ? `נזק: ${qtyDamaged}`
            : null,
      });
      results.push({
        lineId: r.lineId,
        ok: true,
        qtyReceived: qtyGood,
        qtyDamaged,
      });
    } catch (e) {
      results.push({
        lineId: r.lineId,
        ok: false,
        error: e instanceof StockError ? e.message : "שגיאה בקליטה",
      });
    }
  }

  let goodsReceipt = null;
  if (grLines.length) {
    const number =
      String(body.receiptNumber || "").trim() ||
      `GR-${Date.now().toString(36).toUpperCase()}`;
    const hasDamage = grLines.some((l) => l.qtyDamaged > 0);
    goodsReceipt = await prisma.goodsReceipt.create({
      data: {
        companyId: session.companyId,
        purchaseOrderId: po.id,
        number,
        status: "COMPLETED",
        receivedAt: new Date(),
        notes: body.notes
          ? String(body.notes).trim()
          : hasDamage
            ? "כולל פריטים פגומים"
            : null,
        createdById: session.id,
        lines: {
          create: grLines.map((l) => ({
            poLineId: l.poLineId,
            variantId: l.variantId,
            qtyExpected: l.qtyExpected,
            qtyReceived: l.qtyReceived,
            qtyDamaged: l.qtyDamaged,
            notes: l.notes,
          })),
        },
      },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
      },
    });
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
      goodsReceiptId: goodsReceipt?.id,
      ok: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
    },
  });

  const updated = await getOwned(id, session.companyId);
  return NextResponse.json({ po: updated, results, goodsReceipt });
}
