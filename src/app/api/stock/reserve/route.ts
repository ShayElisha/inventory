import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { StockError } from "@/lib/stock";
import {
  assertVariantsOwned,
  requireWriteSession,
} from "@/lib/tenant-guard";

export async function POST(req: NextRequest) {
  try {
    const gate = await requireWriteSession();
    if (gate.error) return gate.error;
    const session = gate.session;

    const { variantId, quantity, reason } = await req.json();
    if (!variantId || !quantity) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const owned = await assertVariantsOwned(session.companyId, [variantId]);
    if (!owned) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
    }

    const qty = Number(quantity);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT id FROM product_variants WHERE id = ${variantId} FOR UPDATE
      `;
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) throw new StockError("אפשרות מוצר לא נמצאה");
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
          reasonCode: "RESERVE",
          userId: session.id,
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
