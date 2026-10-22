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
  companyId?: string | null;
  lotCode?: string | null;
  expiryDate?: Date | string | null;
  serial?: string | null;
  purchaseOrderId?: string | null;
  salesOrderId?: string | null;
  correctedTxnId?: string | null;
  /** FEFO: prefer earliest expiry when outbound without explicit lot */
  preferFefo?: boolean;
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
    companyId,
    lotCode,
    expiryDate,
    serial,
    purchaseOrderId,
    salesOrderId,
    correctedTxnId,
    preferFefo,
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

    let lotId: string | null = null;
    let serialId: string | null = null;
    const absQty = Math.abs(quantityChanged);
    const cid =
      companyId ||
      (
        await tx.product.findFirst({
          where: { id: variant.productId },
          select: { companyId: true },
        })
      )?.companyId;

    if (cid && (lotCode || preferFefo) && type !== "TRANSFER") {
      if (type === "INBOUND" && lotCode) {
        const locKey = locationId || null;
        let lot = await tx.inventoryLot.findFirst({
          where: {
            companyId: cid,
            variantId,
            lotCode,
            locationId: locKey,
          },
        });
        if (!lot) {
          lot = await tx.inventoryLot.create({
            data: {
              companyId: cid,
              variantId,
              lotCode,
              locationId: locKey,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              quantity: absQty,
            },
          });
        } else {
          lot = await tx.inventoryLot.update({
            where: { id: lot.id },
            data: {
              quantity: lot.quantity + absQty,
              expiryDate: expiryDate
                ? new Date(expiryDate)
                : lot.expiryDate,
            },
          });
        }
        lotId = lot.id;
      } else if (type === "OUTBOUND") {
        let lot = lotCode
          ? await tx.inventoryLot.findFirst({
              where: {
                companyId: cid,
                variantId,
                lotCode,
                quantity: { gt: 0 },
              },
              orderBy: { expiryDate: "asc" },
            })
          : preferFefo
            ? await tx.inventoryLot.findFirst({
                where: {
                  companyId: cid,
                  variantId,
                  quantity: { gt: 0 },
                },
                orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
              })
            : null;
        if (lot) {
          if (lot.quantity < absQty) {
            throw new StockError("אין מספיק מלאי באצווה");
          }
          await tx.inventoryLot.update({
            where: { id: lot.id },
            data: { quantity: lot.quantity - absQty },
          });
          lotId = lot.id;
        }
      }
    }

    if (cid && serial) {
      if (type === "INBOUND") {
        const created = await tx.serialNumber.create({
          data: {
            companyId: cid,
            variantId,
            serial: String(serial).trim(),
            status: "IN_STOCK",
            lotId,
            locationId: locationId || null,
          },
        });
        serialId = created.id;
      } else if (type === "OUTBOUND") {
        const sn = await tx.serialNumber.findFirst({
          where: {
            companyId: cid,
            variantId,
            serial: String(serial).trim(),
            status: "IN_STOCK",
          },
        });
        if (!sn) throw new StockError("מספר סידורי לא במלאי");
        await tx.serialNumber.update({
          where: { id: sn.id },
          data: { status: "SOLD" },
        });
        serialId = sn.id;
      }
    }

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
        fromLocationId:
          fromLocationId ??
          (type === "TRANSFER" ? variant.locationId : null),
        toLocationId:
          toLocationId ?? (type === "INBOUND" ? locationId ?? null : null),
        lotId,
        serialId,
        purchaseOrderId: purchaseOrderId || null,
        salesOrderId: salesOrderId || null,
        correctedTxnId: correctedTxnId || null,
      },
    });

    return { variant: updated, transaction: txn };
  });
}

/** תיקון תנועה — יוצר תנועת היפוך ומקשר ל־audit */
export async function correctStockTransaction(params: {
  transactionId: string;
  userId?: string | null;
  reason?: string;
}) {
  const original = await prisma.stockTransaction.findUnique({
    where: { id: params.transactionId },
    include: { variant: { include: { product: true } } },
  });
  if (!original) throw new StockError("תנועה לא נמצאה");
  if (original.correctedTxnId) {
    throw new StockError("התנועה כבר תוקנה");
  }

  const reverseType: StockTxnType =
    original.type === "INBOUND"
      ? "OUTBOUND"
      : original.type === "OUTBOUND"
        ? "INBOUND"
        : "ADJUSTMENT";

  const absQty = Math.abs(original.quantityChanged);
  const result = await applyStockChange({
    variantId: original.variantId,
    type: reverseType,
    quantityChanged: absQty,
    reason: params.reason || `תיקון תנועה ${original.id}`,
    reasonCode: "CORRECTION",
    userId: params.userId,
    companyId: original.variant.product.companyId,
    correctedTxnId: original.id,
    locationId: original.toLocationId,
  });

  await prisma.stockTransaction.update({
    where: { id: original.id },
    data: { correctedTxnId: result.transaction.id },
  });

  return result;
}

/** סימולציה בלי שינוי מלאי */
export async function simulateOutbound(lines: { variantId: string; quantity: number }[]) {
  const results: {
    variantId: string;
    sku: string;
    title: string;
    requested: number;
    available: number;
    ok: boolean;
  }[] = [];

  for (const line of lines) {
    const v = await prisma.productVariant.findUnique({
      where: { id: line.variantId },
      include: { product: true },
    });
    if (!v) {
      results.push({
        variantId: line.variantId,
        sku: "?",
        title: "לא נמצא",
        requested: line.quantity,
        available: 0,
        ok: false,
      });
      continue;
    }
    const available = v.quantityOnHand - v.quantityReserved;
    results.push({
      variantId: v.id,
      sku: v.sku,
      title: v.product.title,
      requested: line.quantity,
      available,
      ok: available >= line.quantity,
    });
  }

  return {
    ok: results.every((r) => r.ok),
    results,
  };
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
