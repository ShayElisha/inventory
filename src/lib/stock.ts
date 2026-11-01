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

/** מסנכרן quantityOnHand של הווריאנט מסכום יתרות המיקום — מקור האמת */
async function reconcileVariantFromBalances(
  tx: Tx,
  variantId: string,
  fallbackOnHand: number
) {
  const agg = await tx.inventoryBalance.aggregate({
    where: { variantId },
    _sum: { quantityOnHand: true },
  });
  const hasRows = await tx.inventoryBalance.count({ where: { variantId } });
  if (hasRows === 0) return fallbackOnHand;
  const sum = agg._sum.quantityOnHand ?? 0;
  await tx.productVariant.update({
    where: { id: variantId },
    data: { quantityOnHand: sum },
  });
  return sum;
}

/** מנכה מלאי ממיקומים — מיקום מבוקש קודם, אחר כך לפי יתרה גדולה */
async function deductFromBalances(
  tx: Tx,
  params: {
    companyId: string;
    variantId: string;
    quantity: number;
    preferredLocationId?: string | null;
  }
): Promise<string | null> {
  let remaining = params.quantity;
  let lastLoc: string | null = params.preferredLocationId || null;

  const preferred = params.preferredLocationId
    ? await tx.inventoryBalance.findUnique({
        where: {
          variantId_locationId: {
            variantId: params.variantId,
            locationId: params.preferredLocationId,
          },
        },
      })
    : null;

  const others = await tx.inventoryBalance.findMany({
    where: {
      companyId: params.companyId,
      variantId: params.variantId,
      quantityOnHand: { gt: 0 },
      ...(params.preferredLocationId
        ? { locationId: { not: params.preferredLocationId } }
        : {}),
    },
    orderBy: { quantityOnHand: "desc" },
  });

  const queue = [
    ...(preferred && preferred.quantityOnHand > 0 ? [preferred] : []),
    ...others,
  ];

  if (!queue.length) {
    // אין יתרות מיקום — נשארים על מודל וריאנט בלבד
    return lastLoc;
  }

  const totalAvail = queue.reduce((s, b) => s + b.quantityOnHand, 0);
  if (totalAvail < remaining) {
    throw new StockError("אין מספיק מלאי במיקומים");
  }

  for (const bal of queue) {
    if (remaining <= 0) break;
    const take = Math.min(bal.quantityOnHand, remaining);
    await syncInventoryBalance(tx, {
      companyId: params.companyId,
      variantId: params.variantId,
      locationId: bal.locationId,
      deltaOnHand: -take,
    });
    lastLoc = bal.locationId;
    remaining -= take;
  }

  return lastLoc;
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
  lotId?: string | null;
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
    lotId: requestedLotId,
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

  const balanceSum = await tx.inventoryBalance.aggregate({
    where: { variantId },
    _sum: { quantityOnHand: true },
  });
  const balanceCount = await tx.inventoryBalance.count({ where: { variantId } });
  // מקור אמת: סכום מיקומים אם קיימות יתרות; אחרת quantityOnHand על הווריאנט
  const previousQuantity =
    balanceCount > 0
      ? balanceSum._sum.quantityOnHand ?? 0
      : variant.quantityOnHand;

  let quantityChanged = params.quantityChanged;
  let newQuantity: number;
  let outboundLocationUsed: string | null = null;

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
    // quantityChanged נשאר ככמות המועברת (חיובי) לצורך יתרות
  } else {
    newQuantity = previousQuantity + quantityChanged;
    if (newQuantity < 0) throw new StockError("כמות לא יכולה להיות שלילית");
  }

  const data: {
    quantityOnHand: number;
    locationId?: string | null;
    quantityReserved?: number;
  } = {
    quantityOnHand: type === "TRANSFER" ? previousQuantity : newQuantity,
  };

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

  let lotId: string | null = null;
  let serialId: string | null = null;
  const absQty =
    type === "TRANSFER"
      ? Math.abs(params.quantityChanged || 0)
      : Math.abs(quantityChanged);

  // יתרות לפי מיקום — מקור האמת
  if (type === "INBOUND" && locationId && absQty) {
    await syncInventoryBalance(tx, {
      companyId: cid,
      variantId,
      locationId,
      deltaOnHand: absQty,
    });
    data.quantityOnHand = await reconcileVariantFromBalances(
      tx,
      variantId,
      newQuantity
    );
  } else if (type === "OUTBOUND" && absQty) {
    const preferred = locationId || variant.locationId;
    outboundLocationUsed = await deductFromBalances(tx, {
      companyId: cid,
      variantId,
      quantity: absQty,
      preferredLocationId: preferred,
    });
    // אם לא היו יתרות מיקום — deductFromBalances לא שינה כלום; נוודא כמות וריאנט
    if (!outboundLocationUsed && preferred) {
      // ניסיון לנכות ממיקום מועדף גם אם לא הייתה שורה (יתרה 0) — כבר נבדק למעלה
    }
    const after = await reconcileVariantFromBalances(tx, variantId, newQuantity);
    if (balanceCount === 0) {
      // אין יתרות — עדכון וריאנט ישיר
      data.quantityOnHand = newQuantity;
    } else {
      data.quantityOnHand = after;
      if (after !== newQuantity) {
        // reconcile כבר עדכן; נתאים את newQuantity לדיווח
        newQuantity = after;
      }
    }
  } else if (type === "TRANSFER" && toLocationId) {
    const moveQty =
      absQty > 0
        ? absQty
        : fromLocationId
          ? (
              await tx.inventoryBalance.findUnique({
                where: {
                  variantId_locationId: {
                    variantId,
                    locationId: fromLocationId,
                  },
                },
              })
            )?.quantityOnHand || 0
          : 0;

    if (moveQty > 0 && fromLocationId && fromLocationId !== toLocationId) {
      await syncInventoryBalance(tx, {
        companyId: cid,
        variantId,
        locationId: fromLocationId,
        deltaOnHand: -moveQty,
      });
      await syncInventoryBalance(tx, {
        companyId: cid,
        variantId,
        locationId: toLocationId,
        deltaOnHand: moveQty,
      });
      quantityChanged = 0; // סה״כ לא משתנה
      data.quantityOnHand = await reconcileVariantFromBalances(
        tx,
        variantId,
        previousQuantity
      );
    } else if (moveQty > 0 && !fromLocationId) {
      // השמה: מלאי על הווריאנט בלי יתרת מיקום → יוצרים יתרה ביעד
      // לא מריצים reconcile שמאפס מלאי שעדיין לא משויך למיקום
      await syncInventoryBalance(tx, {
        companyId: cid,
        variantId,
        locationId: toLocationId,
        deltaOnHand: moveQty,
      });
      quantityChanged = 0;
      data.quantityOnHand = previousQuantity;
      data.locationId = toLocationId;
    } else {
      quantityChanged = 0;
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
      data.quantityOnHand = await reconcileVariantFromBalances(
        tx,
        variantId,
        newQuantity
      );
      newQuantity = data.quantityOnHand;
    }
  } else if (type === "INBOUND" && !locationId && absQty) {
    // כניסה בלי מיקום — רק על הווריאנט (ממתין ל־putaway)
    data.quantityOnHand = newQuantity;
  }

  const updated = await tx.productVariant.update({
    where: { id: variantId },
    data,
  });

  if (
    cid &&
    (lotCode || requestedLotId || preferFefo) &&
    type !== "TRANSFER"
  ) {
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
      const lot = requestedLotId
        ? await tx.inventoryLot.findFirst({
            where: {
              id: requestedLotId,
              companyId: cid,
              variantId,
              quantity: { gt: 0 },
            },
          })
        : lotCode
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
      if (requestedLotId && !lot) {
        throw new StockError("אצווה לא נמצאה או ללא מלאי");
      }
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
        (type === "OUTBOUND"
          ? outboundLocationUsed
          : type === "TRANSFER"
            ? variant.locationId
            : null),
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
      include: { product: true, balances: true },
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
    const fromBalances = v.balances.reduce((s, b) => s + b.quantityOnHand, 0);
    const onHand = v.balances.length > 0 ? fromBalances : v.quantityOnHand;
    const available = onHand - v.quantityReserved;
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

/** זמין לפי מיקומים — לפי מקור האמת */
export async function getVariantAvailableQty(
  companyId: string,
  variantId: string
) {
  const v = await prisma.productVariant.findFirst({
    where: { id: variantId, companyId },
    include: { balances: true },
  });
  if (!v) return 0;
  const fromBalances = v.balances.reduce((s, b) => s + b.quantityOnHand, 0);
  const onHand = v.balances.length > 0 ? fromBalances : v.quantityOnHand;
  return onHand - v.quantityReserved;
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
