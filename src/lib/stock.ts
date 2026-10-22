import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type StockTxnType =
  | "INBOUND"
  | "OUTBOUND"
  | "TRANSFER"
  | "ADJUSTMENT";

type Tx = Prisma.TransactionClient;

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

async function getVariantLocked(tx: Tx, variantId: string) {
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) throw new StockError("אפשרות מוצר לא נמצאה");
  return variant;
}

export async function applyStockChange(params: {
  variantId: string;
  type: StockTxnType;
  /** Absolute delta for INBOUND (+), OUTBOUND (-), or signed delta for ADJUSTMENT */
  quantityChanged: number;
  reason: string;
  reasonCode?: string | null;
  userId?: string | null;
  locationId?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  /** For ADJUSTMENT set-to-count: pass absolute new quantity instead of delta */
  setQuantityTo?: number;
  reserveDelta?: number;
}) {
  const {
    variantId,
    type,
    reason,
    reasonCode,
    userId,
    locationId,
    fromLocationId,
    toLocationId,
    setQuantityTo,
    reserveDelta,
  } = params;

  return prisma.$transaction(async (tx) => {
    const variant = await getVariantLocked(tx, variantId);
    const previousQuantity = variant.quantityOnHand;

    let quantityChanged = params.quantityChanged;
    let newQuantity: number;

    if (type === "ADJUSTMENT" && setQuantityTo !== undefined) {
      newQuantity = setQuantityTo;
      quantityChanged = newQuantity - previousQuantity;
    } else if (type === "INBOUND") {
      if (quantityChanged <= 0) throw new StockError("כמות כניסה חייבת להיות חיובית");
      newQuantity = previousQuantity + quantityChanged;
    } else if (type === "OUTBOUND") {
      if (quantityChanged <= 0) throw new StockError("כמות יציאה חייבת להיות חיובית");
      newQuantity = previousQuantity - quantityChanged;
      if (newQuantity < 0) throw new StockError("אין מספיק מלאי");
      quantityChanged = -quantityChanged;
    } else if (type === "TRANSFER") {
      newQuantity = previousQuantity;
      quantityChanged = 0;
    } else {
      newQuantity = previousQuantity + quantityChanged;
      if (newQuantity < 0) throw new StockError("כמות לא יכולה להיות שלילית");
    }

    const data: {
      quantityOnHand: number;
      locationId?: string | null;
      quantityReserved?: number;
    } = { quantityOnHand: newQuantity };

    if (type === "INBOUND" && locationId) {
      data.locationId = locationId;
    }
    if (type === "TRANSFER" && toLocationId) {
      data.locationId = toLocationId;
    }
    if (reserveDelta) {
      const nextReserved = variant.quantityReserved + reserveDelta;
      if (nextReserved < 0) throw new StockError("שמירה לא תקינה");
      data.quantityReserved = nextReserved;
    }

    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data,
    });

    const txn = await tx.stockTransaction.create({
      data: {
        variantId,
        type,
        quantityChanged,
        previousQuantity,
        newQuantity,
        reason,
        reasonCode: reasonCode || null,
        userId: userId || null,
        fromLocationId: fromLocationId ?? (type === "TRANSFER" ? variant.locationId : null),
        toLocationId: toLocationId ?? (type === "INBOUND" ? locationId ?? null : null),
      },
    });

    return { variant: updated, transaction: txn };
  });
}

export async function quickAdjust(variantId: string, delta: 1 | -1, reason?: string) {
  if (delta === 1) {
    return applyStockChange({
      variantId,
      type: "INBOUND",
      quantityChanged: 1,
      reason: reason ?? "עדכון מהיר +1",
    });
  }
  return applyStockChange({
    variantId,
    type: "OUTBOUND",
    quantityChanged: 1,
    reason: reason ?? "עדכון מהיר -1",
  });
}

export async function transferLocation(
  variantId: string,
  toLocationId: string,
  reason = "העברת מיקום"
) {
  const location = await prisma.warehouseLocation.findUnique({
    where: { id: toLocationId },
  });
  if (!location) throw new StockError("מיקום יעד לא נמצא");

  return applyStockChange({
    variantId,
    type: "TRANSFER",
    quantityChanged: 0,
    reason,
    toLocationId,
  });
}

export async function transferByLocationCode(
  variantId: string,
  locationCode: string,
  reason = "העברת מיקום בסריקה",
  companyId?: string
) {
  const location = await prisma.warehouseLocation.findFirst({
    where: {
      code: locationCode,
      ...(companyId ? { companyId } : {}),
    },
  });
  if (!location) throw new StockError("קוד מיקום לא נמצא");
  return transferLocation(variantId, location.id, reason);
}
