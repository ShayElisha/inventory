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
  // נעילת שורה למניעת race תחת עומס מקבילי
  await tx.$executeRaw`
    SELECT id FROM product_variants WHERE id = ${variantId} FOR UPDATE
  `;
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { companyId: true, title: true } } },
  });
  if (!variant) throw new StockError("אפשרות מוצר לא נמצאה");
  return variant;
}

async function syncInventoryBalance(
  tx: Tx,
  params: {
    companyId: string;
    variantId: string;
    locationId: string;
    deltaOnHand: number;
    deltaReserved?: number;
  }
) {
  const { companyId, variantId, locationId, deltaOnHand } = params;
  const deltaReserved = params.deltaReserved || 0;
  if (!locationId || (deltaOnHand === 0 && deltaReserved === 0)) return;

  const existing = await tx.inventoryBalance.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
  });

  if (!existing) {
    const onHand = Math.max(0, deltaOnHand);
    const reserved = Math.max(0, deltaReserved);
    if (onHand === 0 && reserved === 0) return;
    await tx.inventoryBalance.create({
      data: {
        companyId,
        variantId,
        locationId,
        quantityOnHand: onHand,
        quantityReserved: reserved,
      },
    });
    return;
  }

  const nextOnHand = existing.quantityOnHand + deltaOnHand;
  const nextReserved = existing.quantityReserved + deltaReserved;
  if (nextOnHand < 0) throw new StockError("יתרת מיקום לא יכולה להיות שלילית");
  if (nextReserved < 0) throw new StockError("שמירה במיקום לא תקינה");

  await tx.inventoryBalance.update({
    where: { id: existing.id },
    data: {
      quantityOnHand: nextOnHand,
      quantityReserved: nextReserved,
    },
  });
}

type ApplyParams = {
  variantId: string;
  type: StockTxnType;
  quantityChanged: number;
  reason: string;
  reasonCode?: string | null;
  userId?: string | null;
  locationId?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  setQuantityTo?: number;
  reserveDelta?: number;
  companyId?: string | null;
  lotCode?: string | null;
  expiryDate?: Date | string | null;
  serial?: string | null;
  purchaseOrderId?: string | null;
  salesOrderId?: string | null;
  correctedTxnId?: string | null;
  preferFefo?: boolean;
};

async function applyStockChangeInTx(tx: Tx, params: ApplyParams) {
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

  const variant = await getVariantLocked(tx, variantId);
  const ownedCompany = variant.companyId || variant.product.companyId;
  const cid = companyId || ownedCompany;

  if (companyId && ownedCompany !== companyId) {
    throw new StockError("אפשרות מוצר לא שייכת לחברה");
  }

  const previousQuantity = variant.quantityOnHand;

  let quantityChanged = params.quantityChanged;
  let newQuantity: number;

  if (type === "ADJUSTMENT" && setQuantityTo !== undefined) {
    newQuantity = setQuantityTo;
    quantityChanged = newQuantity - previousQuantity;
  } else if (type === "INBOUND") {
    if (quantityChanged <= 0)
      throw new StockError("כמות כניסה חייבת להיות חיובית");
    newQuantity = previousQuantity + quantityChanged;
  } else if (type === "OUTBOUND") {
    if (quantityChanged <= 0)
      throw new StockError("כמות יציאה חייבת להיות חיובית");
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

  // יתרות לפי מיקום
  if (type === "INBOUND" && locationId && absQty) {
    await syncInventoryBalance(tx, {
      companyId: cid,
      variantId,
      locationId,
      deltaOnHand: absQty,
    });
  } else if (type === "OUTBOUND" && absQty) {
    const loc = locationId || variant.locationId;
    if (loc) {
      await syncInventoryBalance(tx, {
        companyId: cid,
        variantId,
        locationId: loc,
        deltaOnHand: -absQty,
      });
    }
  } else if (type === "TRANSFER" && toLocationId) {
    const from = fromLocationId || variant.locationId;
    // TRANSFER לא משנה כמות כוללת — מעביר יתרה אם יש כמות ידועה ב־onHand
    // כאן מעבירים את כל היתרה המקומית רק כשמעבירים מיקום ברירת מחדל;
    // לשינוי מיקום בלי כמות — מעדכנים locationId בלבד (כבר למעלה).
    if (from && from !== toLocationId && previousQuantity > 0) {
      // לא מזיזים אוטומטית את כל הכמות — רק מסמנים מיקום אחרון.
      // יתרות מפורטות מתעדכנות במסמכי StockTransfer.
    }
  } else if (type === "ADJUSTMENT" && quantityChanged !== 0) {
    const loc = locationId || variant.locationId;
    if (loc) {
      await syncInventoryBalance(tx, {
        companyId: cid,
        variantId,
        locationId: loc,
        deltaOnHand: quantityChanged,
      });
    }
  }

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
            expiryDate: expiryDate ? new Date(expiryDate) : lot.expiryDate,
          },
        });
      }
      lotId = lot.id;
    } else if (type === "OUTBOUND") {
      const lot = lotCode
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
        fromLocationId ?? (type === "TRANSFER" ? variant.locationId : null),
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
}

export async function applyStockChange(
  params: ApplyParams,
  externalTx?: Tx
) {
  if (externalTx) {
    return applyStockChangeInTx(externalTx, params);
  }
  return prisma.$transaction((tx) => applyStockChangeInTx(tx, params));
}

/** ניפוק מרוכז אטומי — הכל או כלום */
export async function applyBulkOutbound(params: {
  companyId: string;
  userId?: string | null;
  reason: string;
  reasonCode?: string | null;
  preferFefo?: boolean;
  lines: {
    variantId: string;
    quantity: number;
    lotCode?: string | null;
    serial?: string | null;
  }[];
}) {
  const lines = params.lines.filter((l) => l.variantId && l.quantity > 0);
  if (!lines.length) throw new StockError("אין שורות");

  return prisma.$transaction(async (tx) => {
    const results: {
      variantId: string;
      sku: string;
      title: string;
      quantity: number;
      ok: true;
      newQuantity: number;
    }[] = [];

    for (const line of lines) {
      const before = await tx.productVariant.findFirst({
        where: {
          id: line.variantId,
          companyId: params.companyId,
        },
        include: { product: true },
      });
      if (!before) throw new StockError("פריט לא שייך לחברה");

      const r = await applyStockChangeInTx(tx, {
        variantId: line.variantId,
        type: "OUTBOUND",
        quantityChanged: line.quantity,
        reason: params.reason,
        reasonCode: params.reasonCode,
        userId: params.userId,
        companyId: params.companyId,
        lotCode: line.lotCode,
        serial: line.serial,
        preferFefo: params.preferFefo !== false && !line.lotCode,
      });

      results.push({
        variantId: line.variantId,
        sku: before.sku,
        title: before.product.title,
        quantity: line.quantity,
        ok: true,
        newQuantity: r.variant.quantityOnHand,
      });
    }

    return { ok: true as const, okCount: results.length, failCount: 0, results };
  });
}

export async function correctStockTransaction(params: {
  transactionId: string;
  userId?: string | null;
  companyId: string;
  reason?: string;
}) {
  const original = await prisma.stockTransaction.findFirst({
    where: {
      id: params.transactionId,
      variant: { product: { companyId: params.companyId } },
    },
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
    companyId: params.companyId,
    correctedTxnId: original.id,
    locationId: original.toLocationId,
  });

  await prisma.stockTransaction.update({
    where: { id: original.id },
    data: { correctedTxnId: result.transaction.id },
  });

  return result;
}

export async function simulateOutbound(
  companyId: string,
  lines: { variantId: string; quantity: number }[]
) {
  const results: {
    variantId: string;
    sku: string;
    title: string;
    requested: number;
    available: number;
    ok: boolean;
  }[] = [];

  for (const line of lines) {
    const v = await prisma.productVariant.findFirst({
      where: { id: line.variantId, companyId },
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

export async function quickAdjust(
  variantId: string,
  delta: 1 | -1,
  reason?: string,
  companyId?: string,
  userId?: string
) {
  if (delta === 1) {
    return applyStockChange({
      variantId,
      type: "INBOUND",
      quantityChanged: 1,
      reason: reason ?? "עדכון מהיר +1",
      companyId,
      userId,
    });
  }
  return applyStockChange({
    variantId,
    type: "OUTBOUND",
    quantityChanged: 1,
    reason: reason ?? "עדכון מהיר -1",
    companyId,
    userId,
  });
}

export async function transferLocation(
  variantId: string,
  toLocationId: string,
  reason = "העברת מיקום",
  companyId?: string,
  userId?: string
) {
  const location = await prisma.warehouseLocation.findFirst({
    where: {
      id: toLocationId,
      ...(companyId ? { companyId } : {}),
    },
  });
  if (!location) throw new StockError("מיקום יעד לא נמצא");

  return applyStockChange({
    variantId,
    type: "TRANSFER",
    quantityChanged: 0,
    reason,
    toLocationId,
    companyId,
    userId,
  });
}

export async function transferByLocationCode(
  variantId: string,
  locationCode: string,
  reason = "העברת מיקום בסריקה",
  companyId?: string,
  userId?: string
) {
  const location = await prisma.warehouseLocation.findFirst({
    where: {
      code: locationCode,
      ...(companyId ? { companyId } : {}),
    },
  });
  if (!location) throw new StockError("קוד מיקום לא נמצא");
  return transferLocation(
    variantId,
    location.id,
    reason,
    companyId,
    userId
  );
}
