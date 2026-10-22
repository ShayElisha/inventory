import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, StockError } from "@/lib/stock";
import { getSession } from "@/lib/auth";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { variantId, quantity, reason, reasonCode, releaseReserved } = body;

    if (!variantId || !quantity) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const code = reasonCode || "SALE";
    const label =
      OUTBOUND_REASONS.find((r) => r.code === code)?.label || reason || code;

    const qty = Number(quantity);
    const result = await applyStockChange({
      variantId,
      type: "OUTBOUND",
      quantityChanged: qty,
      reason: String(reason || label),
      reasonCode: code,
      userId: session?.id,
      reserveDelta: releaseReserved ? -qty : undefined,
    });

    await writeAudit({
      action: "OUTBOUND",
      entityType: "ProductVariant",
      entityId: variantId,
      details: { qty, reasonCode: code },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בעדכון מלאי";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
