import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, StockError } from "@/lib/stock";
import { assertModuleApi } from "@/lib/tenant";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

type InboundLine = {
  variantId: string;
  quantity: number;
  locationId?: string | null;
  lotCode?: string | null;
  expiryDate?: string | null;
  serials?: string[];
};

/**
 * קליטה בודדת או מרובת שורות (קליטה מלאה)
 * body: { variantId, quantity, reason, locationId, ... }
 * או: { lines: InboundLine[], reason?, supplierId?, invoiceNumber?, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await assertModuleApi("inbound");
    if (gate.error) return gate.error;
    const session = gate.session!;

    const body = await req.json();
    const supplierId = body.supplierId || null;
    const invoiceNumber = body.invoiceNumber
      ? String(body.invoiceNumber).trim()
      : null;
    const notes = body.notes ? String(body.notes).trim() : "";
    const reasonBase =
      String(body.reason || "").trim() ||
      (invoiceNumber
        ? `קליטה · חשבונית ${invoiceNumber}`
        : notes
          ? `קליטה · ${notes}`
          : "קליטת סחורה");

    let lines: InboundLine[] = [];
    if (Array.isArray(body.lines) && body.lines.length) {
      lines = body.lines.map(
        (l: InboundLine) => ({
          variantId: String(l.variantId),
          quantity: Number(l.quantity) || 0,
          locationId: l.locationId || null,
          lotCode: l.lotCode || null,
          expiryDate: l.expiryDate || null,
          serials: Array.isArray(l.serials) ? l.serials.map(String) : [],
        })
      );
    } else if (body.variantId) {
      lines = [
        {
          variantId: String(body.variantId),
          quantity: Number(body.quantity) || 0,
          locationId: body.locationId || null,
          lotCode: body.lotCode || null,
          expiryDate: body.expiryDate || null,
          serials: Array.isArray(body.serials)
            ? body.serials.map(String)
            : body.serial
              ? [String(body.serial)]
              : [],
        },
      ];
    }

    lines = lines.filter((l) => l.variantId && l.quantity > 0);
    if (!lines.length) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const variantIds = [...new Set(lines.map((l) => l.variantId))];
    const owned = await prisma.productVariant.count({
      where: {
        id: { in: variantIds },
        product: { companyId: session.companyId },
      },
    });
    if (owned !== variantIds.length) {
      return NextResponse.json(
        { error: "יש פריטים שאינם שייכים לחברה" },
        { status: 400 }
      );
    }

    const results: {
      variantId: string;
      quantity: number;
      ok: boolean;
      error?: string;
      txnId?: string;
    }[] = [];

    for (const line of lines) {
      try {
        const serials = (line.serials || []).filter(Boolean);
        if (serials.length && serials.length !== line.quantity) {
          throw new StockError("מספר סידורי חייב להתאים לכמות");
        }
        if (serials.length) {
          for (const s of serials) {
            const r = await applyStockChange({
              variantId: line.variantId,
              type: "INBOUND",
              quantityChanged: 1,
              reason: reasonBase,
              reasonCode: "INBOUND",
              userId: session.id,
              companyId: session.companyId,
              locationId: line.locationId || null,
              lotCode: line.lotCode || null,
              expiryDate: line.expiryDate || null,
              serial: s,
            });
            results.push({
              variantId: line.variantId,
              quantity: 1,
              ok: true,
              txnId: r.transaction.id,
            });
          }
        } else {
          const r = await applyStockChange({
            variantId: line.variantId,
            type: "INBOUND",
            quantityChanged: line.quantity,
            reason: reasonBase,
            reasonCode: "INBOUND",
            userId: session.id,
            companyId: session.companyId,
            locationId: line.locationId || null,
            lotCode: line.lotCode || null,
            expiryDate: line.expiryDate || null,
          });
          results.push({
            variantId: line.variantId,
            quantity: line.quantity,
            ok: true,
            txnId: r.transaction.id,
          });
        }
      } catch (e) {
        results.push({
          variantId: line.variantId,
          quantity: line.quantity,
          ok: false,
          error: e instanceof StockError ? e.message : "שגיאה בקליטה",
        });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    const totalQty = results
      .filter((r) => r.ok)
      .reduce((s, r) => s + r.quantity, 0);

    await writeAudit({
      action: "INBOUND_BATCH",
      entityType: "StockTransaction",
      entityId: results.find((r) => r.txnId)?.txnId || null,
      details: {
        reason: reasonBase,
        supplierId,
        invoiceNumber,
        notes: notes || null,
        okCount,
        failCount,
        totalQty,
        lineCount: lines.length,
      },
    });

    // תאימות לקליטה מהירה בודדת
    if (!Array.isArray(body.lines) && results.length === 1 && results[0].ok) {
      const last = await prisma.stockTransaction.findUnique({
        where: { id: results[0].txnId! },
        include: { variant: true },
      });
      return NextResponse.json({
        variant: last?.variant,
        transaction: last,
        results,
        okCount,
        failCount,
        totalQty,
      });
    }

    return NextResponse.json({
      results,
      okCount,
      failCount,
      totalQty,
      reason: reasonBase,
    });
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בעדכון מלאי";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
