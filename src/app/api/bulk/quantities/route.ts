import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, StockError } from "@/lib/stock";
import { writeAudit } from "@/lib/audit";
import {
  assertVariantsOwned,
  requireWriteSession,
} from "@/lib/tenant-guard";

export async function POST(req: NextRequest) {
  const gate = await requireWriteSession();
  if (gate.error) return gate.error;
  const session = gate.session;

  const { items, mode } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "אין פריטים" }, { status: 400 });
  }

  const variantIds = items.map((i: { variantId: string }) =>
    String(i.variantId)
  );
  const owned = await assertVariantsOwned(session.companyId, variantIds);
  if (!owned) {
    return NextResponse.json(
      { error: "חלק מהפריטים לא שייכים לחברה" },
      { status: 403 }
    );
  }

  const results = [];
  for (const item of items) {
    try {
      if (mode === "set") {
        const r = await applyStockChange({
          variantId: item.variantId,
          type: "ADJUSTMENT",
          quantityChanged: 0,
          setQuantityTo: Number(item.quantity),
          reason: item.reason || "עדכון כמותי (bulk)",
          reasonCode: "BULK",
          userId: session.id,
          companyId: session.companyId,
        });
        results.push({
          variantId: item.variantId,
          ok: true,
          qty: r.variant.quantityOnHand,
        });
      } else {
        const delta = Number(item.quantity);
        const r = await applyStockChange({
          variantId: item.variantId,
          type: delta >= 0 ? "INBOUND" : "OUTBOUND",
          quantityChanged: Math.abs(delta),
          reason: item.reason || "עדכון כמותי (bulk)",
          reasonCode: "BULK",
          userId: session.id,
          companyId: session.companyId,
        });
        results.push({
          variantId: item.variantId,
          ok: true,
          qty: r.variant.quantityOnHand,
        });
      }
    } catch (e) {
      results.push({
        variantId: item.variantId,
        ok: false,
        error: e instanceof StockError ? e.message : "שגיאה",
      });
    }
  }

  await writeAudit({
    action: "BULK_UPDATE",
    entityType: "ProductVariant",
    userId: session.id,
    details: { mode, count: items.length, results },
  });

  return NextResponse.json({ results });
}
