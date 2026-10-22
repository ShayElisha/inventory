import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { applyStockChange, StockError } from "@/lib/stock";

/** החזרה לספק (RMA יוצא) — מנפק מהמלאי ומפיק מסמך RMA */
export async function POST(req: NextRequest) {
  try {
    const gate = await assertModuleApi("inbound");
    if (gate.error) return gate.error;
    const session = gate.session!;
    if (!canWrite(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const supplierId = body.supplierId || null;
    const lines: {
      variantId: string;
      quantity: number;
      lotCode?: string;
      serial?: string;
    }[] = Array.isArray(body.lines) ? body.lines : [];
    const notes = body.notes ? String(body.notes).trim() : "";

    if (!lines.length) {
      return NextResponse.json({ error: "אין שורות" }, { status: 400 });
    }

    const results = [];
    for (const line of lines) {
      const qty = Math.max(1, Number(line.quantity) || 1);
      try {
        const r = await applyStockChange({
          variantId: String(line.variantId),
          type: "OUTBOUND",
          quantityChanged: qty,
          reason: notes || "החזרה לספק (RMA)",
          reasonCode: "RETURN",
          userId: session.id,
          companyId: session.companyId,
          lotCode: line.lotCode || null,
          serial: line.serial || null,
          preferFefo: !line.lotCode,
        });
        results.push({ variantId: line.variantId, ok: true, txnId: r.transaction.id });
      } catch (e) {
        results.push({
          variantId: line.variantId,
          ok: false,
          error: e instanceof StockError ? e.message : "שגיאה",
        });
      }
    }

    const doc = await prisma.stockDocument.create({
      data: {
        companyId: session.companyId,
        type: "RMA",
        number: `RMA-${Date.now().toString(36).toUpperCase()}`,
        payloadJson: JSON.stringify({ supplierId, notes, results }),
        subtotal: 0,
        vatAmount: 0,
        total: 0,
      },
    });

    await writeAudit({
      action: "SUPPLIER_RMA",
      entityType: "StockDocument",
      entityId: doc.id,
      details: { supplierId, ok: results.filter((r) => r.ok).length },
    });

    return NextResponse.json({ document: doc, results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה ב־RMA" }, { status: 400 });
  }
}
