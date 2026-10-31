import { NextRequest, NextResponse } from "next/server";
import {
  applyBulkOutbound,
  applyStockChange,
  StockError,
} from "@/lib/stock";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import {
  assertVariantsOwned,
  requireWriteSession,
} from "@/lib/tenant-guard";

type OutboundLine = {
  variantId: string;
  quantity: number;
  lotCode?: string | null;
  serial?: string | null;
};

/**
 * ניפוק בודד או מרוכז אטומי (הכל או כלום)
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireWriteSession();
    if (gate.error) return gate.error;
    const session = gate.session;

    const body = await req.json();

    const code = String(body.reasonCode || "SALE");
    const label =
      OUTBOUND_REASONS.find((r) => r.code === code)?.label ||
      body.reason ||
      code;
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

    const owned = await assertVariantsOwned(
      session.companyId,
      lines.map((l) => l.variantId)
    );
    if (!owned) {
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
        userId: session.id,
        details: { qty, reasonCode: code },
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
      });

      return NextResponse.json(result);
    }

    // מרוכז — טרנזקציה אחת (אטומי)
    const bulk = await applyBulkOutbound({
      companyId: session.companyId,
      userId: session.id,
      reason,
      reasonCode: code,
      preferFefo,
      lines,
    });

    await writeAudit({
      action: "BULK_OUTBOUND",
      entityType: "StockTransaction",
      userId: session.id,
      details: {
        reasonCode: code,
        okCount: bulk.okCount,
        lines: bulk.results.length,
        atomic: true,
      },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
    });

    return NextResponse.json(bulk);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בעדכון מלאי";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
