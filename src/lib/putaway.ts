import { prisma } from "@/lib/db";
import { applyStockChange, StockError } from "@/lib/stock";

/** מציע מיקום לפי מלאי קיים של ה־SKU, אחרת מיקום ברירת מחדל של הווריאנט */
export async function suggestPutawayLocation(
  companyId: string,
  variantId: string
): Promise<string | null> {
  const [bestBalance, variant] = await Promise.all([
    prisma.inventoryBalance.findFirst({
      where: {
        companyId,
        variantId,
        quantityOnHand: { gt: 0 },
      },
      orderBy: { quantityOnHand: "desc" },
      select: { locationId: true },
    }),
    prisma.productVariant.findFirst({
      where: { id: variantId, companyId },
      select: { locationId: true },
    }),
  ]);
  return bestBalance?.locationId || variant?.locationId || null;
}

export async function confirmPutaway(params: {
  companyId: string;
  userId?: string | null;
  receiptLineId: string;
  toLocationId: string;
  quantity?: number;
}) {
  const line = await prisma.goodsReceiptLine.findFirst({
    where: {
      id: params.receiptLineId,
      receipt: { companyId: params.companyId },
    },
    include: {
      receipt: { select: { number: true, companyId: true } },
      variant: { select: { id: true, sku: true, locationId: true } },
    },
  });
  if (!line) throw new StockError("שורת קליטה לא נמצאה");
  if (line.putawayStatus === "DONE") {
    throw new StockError("הפריט כבר הושם במדף");
  }
  if (line.qtyReceived <= 0) {
    throw new StockError("אין כמות להשמה");
  }

  const loc = await prisma.warehouseLocation.findFirst({
    where: { id: params.toLocationId, companyId: params.companyId },
  });
  if (!loc) throw new StockError("מיקום יעד לא נמצא");

  const qty = Math.min(
    params.quantity ?? line.qtyReceived,
    line.qtyReceived
  );
  if (qty <= 0) throw new StockError("כמות לא תקינה");

  if (line.locationId === params.toLocationId) {
    // כבר במיקום היעד — רק סוגרים משימה
  } else if (line.locationId && line.locationId !== params.toLocationId) {
    await applyStockChange({
      variantId: line.variantId,
      type: "TRANSFER",
      quantityChanged: qty,
      reason: `השמה למדף · ${line.receipt.number}`,
      reasonCode: "PUTAWAY",
      userId: params.userId,
      companyId: params.companyId,
      fromLocationId: line.locationId,
      toLocationId: params.toLocationId,
    });
  } else {
    await applyStockChange({
      variantId: line.variantId,
      type: "TRANSFER",
      quantityChanged: qty,
      reason: `השמה למדף · ${line.receipt.number}`,
      reasonCode: "PUTAWAY",
      userId: params.userId,
      companyId: params.companyId,
      toLocationId: params.toLocationId,
      locationId: params.toLocationId,
    });
  }

  const updated = await prisma.goodsReceiptLine.update({
    where: { id: line.id },
    data: {
      locationId: params.toLocationId,
      putawayStatus: "DONE",
    },
    include: {
      variant: { include: { product: { select: { title: true } } } },
      receipt: { select: { number: true } },
    },
  });

  return updated;
}
