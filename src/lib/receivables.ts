import { prisma } from "@/lib/db";

/** יתרות גבייה מול לקוחות (AR) וחוב לספקים (AP משוער מ־PO) */
export async function getCustomerReceivables(companyId: string) {
  const invoices = await prisma.stockDocument.findMany({
    where: {
      companyId,
      type: "INVOICE",
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    include: {
      salesOrder: {
        select: {
          customerId: true,
          customerName: true,
          number: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  type Row = {
    customerKey: string;
    customerId: string | null;
    customerName: string;
    invoiceCount: number;
    total: number;
    paid: number;
    due: number;
    invoices: {
      id: string;
      number: string;
      total: number;
      paidAmount: number;
      due: number;
      paymentStatus: string;
      orderNumber: string | null;
    }[];
  };

  const map = new Map<string, Row>();
  for (const inv of invoices) {
    const name =
      inv.salesOrder?.customerName ||
      "ללא לקוח";
    const customerId = inv.salesOrder?.customerId || null;
    const key = customerId || `name:${name}`;
    const due = Math.max(0, inv.total - (inv.paidAmount || 0));
    const row =
      map.get(key) ||
      ({
        customerKey: key,
        customerId,
        customerName: name,
        invoiceCount: 0,
        total: 0,
        paid: 0,
        due: 0,
        invoices: [],
      } satisfies Row);
    row.invoiceCount += 1;
    row.total += inv.total;
    row.paid += inv.paidAmount || 0;
    row.due += due;
    row.invoices.push({
      id: inv.id,
      number: inv.number,
      total: inv.total,
      paidAmount: inv.paidAmount || 0,
      due,
      paymentStatus: inv.paymentStatus,
      orderNumber: inv.salesOrder?.number || null,
    });
    map.set(key, row);
  }

  const customers = [...map.values()].sort((a, b) => b.due - a.due);
  return {
    customers,
    totals: {
      due: customers.reduce((s, c) => s + c.due, 0),
      total: customers.reduce((s, c) => s + c.total, 0),
      paid: customers.reduce((s, c) => s + c.paid, 0),
      count: invoices.length,
    },
  };
}

export async function getSupplierPayables(companyId: string) {
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      companyId,
      status: { in: ["ORDERED", "PARTIAL", "DRAFT"] },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: true,
    },
  });

  type Row = {
    supplierId: string | null;
    supplierName: string;
    poCount: number;
    openValue: number;
    orders: {
      id: string;
      number: string;
      status: string;
      value: number;
    }[];
  };

  const map = new Map<string, Row>();
  for (const po of pos) {
    const value = po.lines.reduce(
      (s, l) => s + (l.qtyOrdered - l.qtyReceived) * (l.unitCost || 0),
      0
    );
    if (value <= 0 && po.status !== "DRAFT") continue;
    const key = po.supplierId || "none";
    const row =
      map.get(key) ||
      ({
        supplierId: po.supplierId,
        supplierName: po.supplier?.name || "ללא ספק",
        poCount: 0,
        openValue: 0,
        orders: [],
      } satisfies Row);
    row.poCount += 1;
    row.openValue += value;
    row.orders.push({
      id: po.id,
      number: po.number,
      status: po.status,
      value,
    });
    map.set(key, row);
  }

  const suppliers = [...map.values()].sort((a, b) => b.openValue - a.openValue);
  return {
    suppliers,
    totals: {
      openValue: suppliers.reduce((s, x) => s + x.openValue, 0),
      count: pos.length,
    },
  };
}
