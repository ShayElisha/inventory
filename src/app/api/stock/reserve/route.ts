import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { StockError } from "@/lib/stock";

export async function POST(req: NextRequest) {
  try {
    const { variantId, quantity, reason } = await req.json();
    if (!variantId || !quantity) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const qty = Number(quantity);
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (!variant) throw new StockError("וריאציה לא נמצאה");
      const available = variant.quantityOnHand - variant.quantityReserved;
      if (qty > available) throw new StockError("אין מספיק מלאי פנוי לשמירה");

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { quantityReserved: variant.quantityReserved + qty },
      });

      await tx.stockTransaction.create({
        data: {
          variantId,
          type: "ADJUSTMENT",
          quantityChanged: 0,
          previousQuantity: variant.quantityOnHand,
          newQuantity: variant.quantityOnHand,
          reason: reason || `שמירת מלאי: ${qty}`,
        },
      });

      return updated;
    });

    return NextResponse.json({ variant: result });
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בשמירה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
