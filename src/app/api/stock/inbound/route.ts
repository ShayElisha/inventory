import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, StockError } from "@/lib/stock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variantId, quantity, reason, locationId } = body;

    if (!variantId || !quantity || !reason) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const result = await applyStockChange({
      variantId,
      type: "INBOUND",
      quantityChanged: Number(quantity),
      reason: String(reason),
      locationId: locationId || null,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בעדכון מלאי";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
