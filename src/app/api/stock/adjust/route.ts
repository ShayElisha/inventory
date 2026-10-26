import { NextRequest, NextResponse } from "next/server";
import { applyStockChange, quickAdjust, StockError } from "@/lib/stock";
import {
  assertVariantsOwned,
  requireWriteSession,
} from "@/lib/tenant-guard";

export async function POST(req: NextRequest) {
  try {
    const gate = await requireWriteSession();
    if (gate.error) return gate.error;
    const session = gate.session;

    const body = await req.json();
    const { variantId, mode, quantity, countedQuantity, reason, delta } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "חסר מזהה אפשרות מוצר" },
        { status: 400 }
      );
    }

    const owned = await assertVariantsOwned(session.companyId, [variantId]);
    if (!owned) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
    }

    if (mode === "quick") {
      const d = Number(delta) === -1 ? -1 : 1;
      const result = await quickAdjust(
        variantId,
        d as 1 | -1,
        reason,
        session.companyId,
        session.id
      );
      return NextResponse.json(result);
    }

    if (mode === "count" || countedQuantity !== undefined) {
      const result = await applyStockChange({
        variantId,
        type: "ADJUSTMENT",
        quantityChanged: 0,
        setQuantityTo: Number(countedQuantity ?? quantity),
        reason: reason || "ספירת מלאי",
        companyId: session.companyId,
        userId: session.id,
      });
      return NextResponse.json(result);
    }

    const result = await applyStockChange({
      variantId,
      type: "ADJUSTMENT",
      quantityChanged: Number(quantity),
      reason: reason || "התאמת מלאי",
      companyId: session.companyId,
      userId: session.id,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בהתאמה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
