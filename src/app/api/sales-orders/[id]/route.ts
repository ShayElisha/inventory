import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { applyStockChange, StockError, simulateOutbound } from "@/lib/stock";
import {
  calcDocTotals,
  discountPercentForQty,
  parseDiscountTiers,
  soStatusAfterFulfill,
} from "@/lib/commerce";

async function getOwned(id: string, companyId: string) {
  return prisma.salesOrder.findFirst({
    where: { id, companyId },
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  const { id } = await params;
  const order = await getOwned(id, session.companyId);
  if (!order) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const order = await getOwned(id, session.companyId);
  if (!order) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status != null) data.status = String(body.status);
  if (body.priority != null) {
    data.priority = Math.min(5, Math.max(1, Number(body.priority) || 3));
  }
  if (body.slaDueAt !== undefined) {
    data.slaDueAt = body.slaDueAt ? new Date(body.slaDueAt) : null;
  }
  if (body.shippingCarrier !== undefined) {
    data.shippingCarrier = body.shippingCarrier
      ? String(body.shippingCarrier).trim()
      : null;
  }
  if (body.shippingRef !== undefined) {
    data.shippingRef = body.shippingRef
      ? String(body.shippingRef).trim()
      : null;
  }
  if (body.vatRate !== undefined) data.vatRate = Number(body.vatRate) || 0;
  if (body.discountTiers !== undefined) {
    data.discountTiers = JSON.stringify(body.discountTiers || []);
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }

  // סטטוס ארוז / יצא
  if (body.status === "PACKED" || body.status === "SHIPPED") {
    if (!["FULFILLED", "PACKED", "SHIPPED"].includes(order.status) && body.status === "SHIPPED") {
      // allow packing after fulfill
    }
  }

  const updated = await prisma.salesOrder.update({
    where: { id },
    data,
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      documents: true,
    },
  });
  return NextResponse.json(updated);
}

/**
 * action=fulfill | simulate | document | return
 * fulfill: ניפוק חלקי/מלא מול הזמנה
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const order = await getOwned(id, session.companyId);
  if (!order) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const body = await req.json();
  const action = String(body.action || "fulfill");

  if (action === "simulate") {
    const lines = (body.lines as { lineId: string; quantity: number }[]) || [];
    const sim = await simulateOutbound(
      session.companyId,
      lines
        .map((l) => {
          const line = order.lines.find((x) => x.id === l.lineId);
          return {
            variantId: line?.variantId || "",
            quantity: Number(l.quantity) || 0,
          };
        })
        .filter((l) => l.variantId)
    );
    return NextResponse.json(sim);
  }

  if (action === "document") {
    const type = String(body.type || "DELIVERY_NOTE"); // INVOICE | DELIVERY_NOTE | CREDIT_NOTE
    const tiers = parseDiscountTiers(order.discountTiers);
    const totalQty = order.lines.reduce(
      (s, l) => s + (l.qtyFulfilled || l.qtyOrdered),
      0
    );
    const disc = discountPercentForQty(tiers, totalQty);
    const totals = calcDocTotals({
      lines: order.lines.map((l) => ({
        qty: l.qtyFulfilled || l.qtyOrdered,
        unitPrice: l.unitPrice,
      })),
      vatRate: order.vatRate,
      discountPercent: disc,
    });
    const number =
      String(body.number || "").trim() ||
      `${type === "INVOICE" ? "INV" : type === "CREDIT_NOTE" ? "CR" : "DN"}-${Date.now().toString(36).toUpperCase()}`;

    const doc = await prisma.stockDocument.create({
      data: {
        companyId: session.companyId,
        type,
        number,
        salesOrderId: order.id,
        payloadJson: JSON.stringify({
          customerName: order.customerName,
          lines: order.lines.map((l) => ({
            sku: l.variant.sku,
            title: l.variant.product.title,
            qty: l.qtyFulfilled || l.qtyOrdered,
            unitPrice: l.unitPrice,
          })),
          discountPercent: disc,
        }),
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
      },
    });
    await writeAudit({
      action: "CREATE_DOCUMENT",
      entityType: "StockDocument",
      entityId: doc.id,
      details: { type, number, salesOrderId: order.id },
    });
    return NextResponse.json(doc, { status: 201 });
  }

  if (action === "return") {
    // החזרת לקוח למלאי (+ אופציונלי זיכוי)
    const lines: { lineId: string; quantity: number }[] = Array.isArray(
      body.lines
    )
      ? body.lines
      : [];
    const results: { lineId: string; ok: boolean; error?: string }[] = [];
    for (const r of lines) {
      const line = order.lines.find((l) => l.id === r.lineId);
      if (!line) {
        results.push({ lineId: r.lineId, ok: false, error: "שורה לא נמצאה" });
        continue;
      }
      const qty = Math.max(0, Number(r.quantity) || 0);
      if (qty <= 0 || qty > line.qtyFulfilled) {
        results.push({ lineId: r.lineId, ok: false, error: "כמות לא תקינה" });
        continue;
      }
      try {
        await applyStockChange({
          variantId: line.variantId,
          type: "INBOUND",
          quantityChanged: qty,
          reason: `החזרת לקוח · ${order.number}`,
          reasonCode: "CUSTOMER_RETURN",
          userId: session.id,
          companyId: session.companyId,
          salesOrderId: order.id,
        });
        await prisma.salesOrderLine.update({
          where: { id: line.id },
          data: { qtyFulfilled: Math.max(0, line.qtyFulfilled - qty) },
        });
        results.push({ lineId: r.lineId, ok: true });
      } catch (e) {
        results.push({
          lineId: r.lineId,
          ok: false,
          error: e instanceof StockError ? e.message : "שגיאה",
        });
      }
    }

    if (body.createCredit) {
      const returned = lines.filter((l) =>
        results.find((r) => r.lineId === l.lineId && r.ok)
      );
      const totals = calcDocTotals({
        lines: returned.map((r) => {
          const line = order.lines.find((l) => l.id === r.lineId)!;
          return { qty: r.quantity, unitPrice: line.unitPrice };
        }),
        vatRate: order.vatRate,
        discountPercent: 0,
      });
      await prisma.stockDocument.create({
        data: {
          companyId: session.companyId,
          type: "CREDIT_NOTE",
          number: `CR-${Date.now().toString(36).toUpperCase()}`,
          salesOrderId: order.id,
          payloadJson: JSON.stringify({ exchange: Boolean(body.exchange) }),
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
        },
      });
    }

    const fresh = await getOwned(id, session.companyId);
    return NextResponse.json({ order: fresh, results });
  }

  // fulfill — ניפוק
  if (order.status === "CANCELLED" || order.status === "SHIPPED") {
    return NextResponse.json({ error: "לא ניתן לנפק להזמנה זו" }, { status: 400 });
  }

  const fulfillLines: {
    lineId: string;
    quantity: number;
    lotCode?: string;
    serial?: string;
  }[] = Array.isArray(body.lines) ? body.lines : [];

  if (!fulfillLines.length) {
    return NextResponse.json({ error: "אין שורות לניפוק" }, { status: 400 });
  }

  if (body.simulateFirst) {
    const sim = await simulateOutbound(
      session.companyId,
      fulfillLines
        .map((l) => {
          const line = order.lines.find((x) => x.id === l.lineId);
          return {
            variantId: line?.variantId || "",
            quantity: Number(l.quantity) || 0,
          };
        })
        .filter((l) => l.variantId)
    );
    if (!sim.ok) {
      return NextResponse.json(
        { error: "אין מספיק מלאי", simulation: sim },
        { status: 400 }
      );
    }
  }

  const results: { lineId: string; ok: boolean; error?: string }[] = [];
  for (const r of fulfillLines) {
    const line = order.lines.find((l) => l.id === r.lineId);
    if (!line) {
      results.push({ lineId: r.lineId, ok: false, error: "שורה לא נמצאה" });
      continue;
    }
    const qty = Math.max(0, Number(r.quantity) || 0);
    const remaining = line.qtyOrdered - line.qtyFulfilled;
    if (qty <= 0 || qty > remaining) {
      results.push({
        lineId: r.lineId,
        ok: false,
        error: `נותרו לניפוק ${remaining}`,
      });
      continue;
    }
    try {
      await applyStockChange({
        variantId: line.variantId,
        type: "OUTBOUND",
        quantityChanged: qty,
        reason: `הזמנת לקוח ${order.number}`,
        reasonCode: "SALE",
        userId: session.id,
        companyId: session.companyId,
        salesOrderId: order.id,
        lotCode: r.lotCode || null,
        serial: r.serial || null,
        preferFefo: !r.lotCode,
      });
      await prisma.salesOrderLine.update({
        where: { id: line.id },
        data: { qtyFulfilled: line.qtyFulfilled + qty },
      });
      line.qtyFulfilled += qty;
      results.push({ lineId: r.lineId, ok: true });
    } catch (e) {
      // רשימת המתנה אוטומטית כשאין מלאי
      if (e instanceof StockError && e.message.includes("מלאי")) {
        await prisma.waitlistItem.create({
          data: {
            companyId: session.companyId,
            variantId: line.variantId,
            quantity: qty,
            customerName: order.customerName,
            notes: `מהזמנה ${order.number}`,
          },
        });
      }
      results.push({
        lineId: r.lineId,
        ok: false,
        error: e instanceof StockError ? e.message : "שגיאה",
      });
    }
  }

  const fresh = await getOwned(id, session.companyId);
  if (fresh) {
    const ordered = fresh.lines.reduce((s, l) => s + l.qtyOrdered, 0);
    const fulfilled = fresh.lines.reduce((s, l) => s + l.qtyFulfilled, 0);
    let status = soStatusAfterFulfill(ordered, fulfilled);
    if (fresh.status === "PACKED" || fresh.status === "SHIPPED") {
      status = fresh.status;
    }
    await prisma.salesOrder.update({ where: { id }, data: { status } });
  }

  await writeAudit({
    action: "FULFILL_SO",
    entityType: "SalesOrder",
    entityId: id,
    details: {
      number: order.number,
      ok: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
    },
  });

  const updated = await getOwned(id, session.companyId);
  return NextResponse.json({ order: updated, results });
}
