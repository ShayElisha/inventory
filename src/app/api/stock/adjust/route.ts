import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, quickAdjust, StockError } from "@/lib/stock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variantId, mode, quantity, countedQuantity, reason, delta } = body;

    if (!variantId) {
      return NextResponse.json({ error: "חסר מזהה אפשרות מוצר" }, { status: 400 });
    }

    if (mode === "quick") {
      const d = Number(delta) === -1 ? -1 : 1;
      const result = await quickAdjust(variantId, d as 1 | -1, reason);
      return NextResponse.json(result);
    }

    if (mode === "count" || countedQuantity !== undefined) {
      const result = await applyStockChange({
        variantId,
        type: "ADJUSTMENT",
        quantityChanged: 0,
        setQuantityTo: Number(countedQuantity ?? quantity),
        reason: reason || "ספירת מלאי",
      });
      return NextResponse.json(result);
    }

    const result = await applyStockChange({
      variantId,
      type: "ADJUSTMENT",
      quantityChanged: Number(quantity),
      reason: reason || "התאמת מלאי",
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בהתאמה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
