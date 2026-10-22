import { NextRequest, NextResponse } from "next/server";
import { applyStockChange } from "@/lib/stock";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { items, mode } = await req.json();
  // mode: set | delta
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "אין פריטים" }, { status: 400 });
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
          userId: session?.id,
        });
        results.push({ variantId: item.variantId, ok: true, qty: r.variant.quantityOnHand });
      } else {
        const delta = Number(item.quantity);
        const r = await applyStockChange({
          variantId: item.variantId,
          type: delta >= 0 ? "INBOUND" : "OUTBOUND",
          quantityChanged: Math.abs(delta),
          reason: item.reason || "עדכון כמותי (bulk)",
          reasonCode: "BULK",
          userId: session?.id,
        });
        results.push({ variantId: item.variantId, ok: true, qty: r.variant.quantityOnHand });
      }
    } catch (e) {
      results.push({
        variantId: item.variantId,
        ok: false,
        error: e instanceof Error ? e.message : "שגיאה",
      });
    }
  }

  await writeAudit({
    action: "BULK_UPDATE",
    entityType: "ProductVariant",
    details: { mode, count: items.length, results },
  });

  return NextResponse.json({ results });
}
