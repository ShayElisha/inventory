import { prisma } from "@/lib/db";
import { applyStockChange, StockError } from "@/lib/stock";
import { soStatusAfterFulfill } from "@/lib/commerce";

export type PickItemInput = {
  itemId: string;
  quantity?: number;
  lotId?: string | null;
  lotCode?: string | null;
  serials?: string[] | null;
  serial?: string | null;
};

/**
 * ליקוט שורת רשימה: ירידת מלאי + סנכרון qtyFulfilled להזמנה מקושרת.
 */
export async function executePickItem(params: {
  pickListId: string;
  companyId: string;
  userId: string;
  input: PickItemInput;
}) {
  const { pickListId, companyId, userId, input } = params;

  const list = await prisma.pickList.findFirst({
    where: { id: pickListId, companyId },
    select: { id: true, status: true, salesOrderId: true, reference: true },
  });
  if (!list) throw new StockError("רשימת ליקוט לא נמצאה");
  if (list.status === "CANCELLED" || list.status === "DONE") {
    throw new StockError("לא ניתן ללקט רשימה שנסגרה או בוטלה");
  }

  const item = await prisma.pickListItem.findUnique({
    where: { id: input.itemId },
    include: {
      variant: { include: { product: true } },
    },
  });
  if (!item || item.pickListId !== pickListId) {
    throw new StockError("פריט לא נמצא");
  }

  const qty = Number(
    input.quantity ?? Math.max(0, item.quantity - item.pickedQty)
  );
  if (qty <= 0) throw new StockError("כמות לא תקינה");
  if (item.pickedQty + qty > item.quantity) {
    throw new StockError("כמות מעבר ליתרת הליקוט");
  }

  const trackLots = Boolean(item.variant.product.trackLots);
  const trackSerials = Boolean(item.variant.product.trackSerials);

  if (trackLots && !input.lotId && !input.lotCode) {
    throw new StockError("חובה לבחור אצווה למוצר זה");
  }

  const serials = Array.isArray(input.serials)
    ? input.serials.map((s) => String(s).trim()).filter(Boolean)
    : input.serial
      ? [String(input.serial).trim()]
      : [];

  if (trackSerials) {
    if (serials.length !== qty) {
      throw new StockError(`חובה לספק ${qty} מספרים סידוריים`);
    }
  }

  const reason = list.salesOrderId
    ? `ליקוט הזמנה · ${list.reference}`
    : `ליקוט · ${list.reference}`;

  try {
    if (trackSerials && serials.length) {
      for (const serial of serials) {
        await applyStockChange({
          variantId: item.variantId,
          type: "OUTBOUND",
          quantityChanged: 1,
          reason,
          reasonCode: "SALE",
          userId,
          companyId,
          salesOrderId: list.salesOrderId,
          lotId: input.lotId || null,
          lotCode: input.lotCode || null,
          serial,
          preferFefo: !input.lotId && !input.lotCode,
        });
      }
    } else {
      await applyStockChange({
        variantId: item.variantId,
        type: "OUTBOUND",
        quantityChanged: qty,
        reason,
        reasonCode: "SALE",
        userId,
        companyId,
        salesOrderId: list.salesOrderId,
        lotId: input.lotId || null,
        lotCode: input.lotCode || null,
        preferFefo: !input.lotId && !input.lotCode,
      });
    }
  } catch (e) {
    if (
      e instanceof StockError &&
      e.message.includes("מלאי") &&
      list.salesOrderId
    ) {
      const order = await prisma.salesOrder.findUnique({
        where: { id: list.salesOrderId },
        select: { customerName: true, number: true, customerId: true },
      });
      await prisma.waitlistItem.create({
        data: {
          companyId,
          variantId: item.variantId,
          quantity: qty,
          customerId: order?.customerId || null,
          customerName: order?.customerName || null,
          notes: `מליקוט הזמנה ${order?.number || list.reference}`,
        },
      });
    }
    throw e;
  }

  const pickedQty = item.pickedQty + qty;
  await prisma.pickListItem.update({
    where: { id: item.id },
    data: {
      pickedQty,
      status: pickedQty >= item.quantity ? "DONE" : "PENDING",
    },
  });

  if (item.salesOrderLineId) {
    const line = await prisma.salesOrderLine.findUnique({
      where: { id: item.salesOrderLineId },
    });
    if (line) {
      const nextFulfilled = Math.min(
        line.qtyOrdered,
        line.qtyFulfilled + qty
      );
      await prisma.salesOrderLine.update({
        where: { id: line.id },
        data: { qtyFulfilled: nextFulfilled },
      });
    }
  }

  await prisma.pickList.update({
    where: { id: pickListId },
    data: { status: "IN_PROGRESS", updatedAt: new Date() },
  });

  const remaining = await prisma.pickListItem.count({
    where: { pickListId, status: "PENDING" },
  });
  if (remaining === 0) {
    await prisma.pickList.update({
      where: { id: pickListId },
      data: { status: "DONE", updatedAt: new Date() },
    });
  }

  if (list.salesOrderId) {
    await syncSalesOrderFulfillmentStatus(list.salesOrderId);
  }

  return { ok: true as const, qty, remaining };
}

export async function syncSalesOrderFulfillmentStatus(orderId: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) return;
  if (order.status === "CANCELLED" || order.status === "PACKED" || order.status === "SHIPPED") {
    return;
  }
  const ordered = order.lines.reduce((s, l) => s + l.qtyOrdered, 0);
  const fulfilled = order.lines.reduce((s, l) => s + l.qtyFulfilled, 0);
  const status = soStatusAfterFulfill(ordered, fulfilled);
  await prisma.salesOrder.update({
    where: { id: orderId },
    data: { status },
  });
}

export async function createPickFromSalesOrder(params: {
  orderId: string;
  companyId: string;
  userId: string;
  autoComplete?: boolean;
}) {
  const order = await prisma.salesOrder.findFirst({
    where: { id: params.orderId, companyId: params.companyId },
    include: { lines: { include: { variant: { include: { product: true } } } } },
  });
  if (!order) throw new StockError("הזמנה לא נמצאה");
  if (order.status === "CANCELLED" || order.status === "SHIPPED") {
    throw new StockError("לא ניתן ליצור ליקוט להזמנה זו");
  }

  const openPick = await prisma.pickList.findFirst({
    where: {
      salesOrderId: order.id,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });
  if (openPick) {
    throw new StockError("כבר קיימת רשימת ליקוט פתוחה להזמנה זו");
  }

  const remainingLines = order.lines
    .map((l) => ({
      line: l,
      qty: Math.max(0, l.qtyOrdered - l.qtyFulfilled),
    }))
    .filter((x) => x.qty > 0);

  if (!remainingLines.length) {
    throw new StockError("אין שורות שנותרו לליקוט");
  }

  if (params.autoComplete) {
    const blocked = remainingLines.filter(
      (x) => x.line.variant.product.trackLots || x.line.variant.product.trackSerials
    );
    if (blocked.length) {
      throw new StockError(
        "מילוי מהיר לא זמין למוצרים עם מעקב אצווה/סריאל — צרו ליקוט ובחרו ידנית"
      );
    }
  }

  const pick = await prisma.pickList.create({
    data: {
      companyId: params.companyId,
      salesOrderId: order.id,
      reference: `SO-${order.number}`,
      notes: `ליקוט מהזמנה ${order.number}`,
      createdById: params.userId,
      items: {
        create: remainingLines.map((x) => ({
          variantId: x.line.variantId,
          salesOrderLineId: x.line.id,
          quantity: x.qty,
        })),
      },
    },
    include: { items: true },
  });

  if (params.autoComplete) {
    for (const item of pick.items) {
      await executePickItem({
        pickListId: pick.id,
        companyId: params.companyId,
        userId: params.userId,
        input: { itemId: item.id, quantity: item.quantity },
      });
    }
  }

  return prisma.pickList.findUniqueOrThrow({
    where: { id: pick.id },
    include: {
      items: {
        include: { variant: { include: { product: true, location: true } } },
      },
    },
  });
}
