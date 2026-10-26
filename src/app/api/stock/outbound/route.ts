import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, StockError } from "@/lib/stock";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { prisma } from "@/lib/db";

type OutboundLine = {
  variantId: string;
  quantity: number;
  lotCode?: string | null;
  serial?: string | null;
};

/**
 * ניפוק בודד או מרוכז (רב־שורות)
 * body: { variantId, quantity, reasonCode?, reason?, releaseReserved? }
 * או: { lines: OutboundLine[], reasonCode?, reason?, notes?, preferFefo? }
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await assertModuleApi("sales");
    if (gate.error) return gate.error;
    const session = gate.session!;
    const body = await req.json();

    const code = String(body.reasonCode || "SALE");
    const label =
      OUTBOUND_REASONS.find((r) => r.code === code)?.label || body.reason || code;
    const notes = body.notes ? String(body.notes).trim() : "";
    const reason = String(
      body.reason || (notes ? `${label} · ${notes}` : label)
    );
    const preferFefo = body.preferFefo !== false;

    let lines: OutboundLine[] = [];
    if (Array.isArray(body.lines) && body.lines.length) {
      lines = body.lines.map((l: OutboundLine) => ({
        variantId: String(l.variantId),
        quantity: Number(l.quantity) || 0,
        lotCode: l.lotCode || null,
        serial: l.serial || null,
      }));
    } else if (body.variantId) {
      lines = [
        {
          variantId: String(body.variantId),
          quantity: Number(body.quantity) || 0,
          lotCode: body.lotCode || null,
          serial: body.serial || null,
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
      return NextResponse.json({ error: "פריט לא שייך לחברה" }, { status: 403 });
    }

    // ניפוק בודד — תשובה תואמת לאחור
    if (lines.length === 1 && !Array.isArray(body.lines)) {
      const line = lines[0];
      const qty = line.quantity;
      const result = await applyStockChange({
        variantId: line.variantId,
        type: "OUTBOUND",
        quantityChanged: qty,
        reason,
        reasonCode: code,
        userId: session.id,
        companyId: session.companyId,
        lotCode: line.lotCode,
        serial: line.serial,
        preferFefo: preferFefo && !line.lotCode,
        reserveDelta: body.releaseReserved ? -qty : undefined,
      });

      await writeAudit({
        action: "OUTBOUND",
        entityType: "ProductVariant",
        entityId: line.variantId,
        details: { qty, reasonCode: code },
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      });

      return NextResponse.json(result);
    }

    const results: {
      variantId: string;
      sku: string;
      title: string;
      quantity: number;
      ok: boolean;
      error?: string;
      newQuantity?: number;
    }[] = [];

    for (const line of lines) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: line.variantId },
        include: { product: true },
      });
      try {
        const r = await applyStockChange({
          variantId: line.variantId,
          type: "OUTBOUND",
          quantityChanged: line.quantity,
          reason,
          reasonCode: code,
          userId: session.id,
          companyId: session.companyId,
          lotCode: line.lotCode,
          serial: line.serial,
          preferFefo: preferFefo && !line.lotCode,
        });
        results.push({
          variantId: line.variantId,
          sku: variant?.sku || "?",
          title: variant?.product.title || "?",
          quantity: line.quantity,
          ok: true,
          newQuantity: r.variant.quantityOnHand,
        });
      } catch (e) {
        results.push({
          variantId: line.variantId,
          sku: variant?.sku || "?",
          title: variant?.product.title || "?",
          quantity: line.quantity,
          ok: false,
          error: e instanceof StockError ? e.message : "שגיאה",
        });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;

    await writeAudit({
      action: "BULK_OUTBOUND",
      entityType: "StockTransaction",
      details: {
        reasonCode: code,
        okCount,
        failCount,
        lines: results.length,
      },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
    });

    return NextResponse.json({
      ok: failCount === 0,
      okCount,
      failCount,
      results,
    });
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בעדכון מלאי";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
