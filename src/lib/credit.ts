import { prisma } from "@/lib/db";
import { calcDocTotals } from "@/lib/commerce";

export class CreditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreditError";
  }
}

/** סכום הזמנה כולל מע״מ (לפי שורות) */
export function orderLinesTotal(
  lines: { qtyOrdered: number; unitPrice: number }[],
  vatRate = 17
) {
  return calcDocTotals({
    lines: lines.map((l) => ({ qty: l.qtyOrdered, unitPrice: l.unitPrice })),
    vatRate,
    discountPercent: 0,
  }).total;
}

/**
 * חשיפת אשראי ללקוח:
 * יתרת חשבוניות לא שולמו במלואן + הזמנות פתוחות שאין עליהן חשבונית.
 */
export async function getCustomerCreditExposure(
  companyId: string,
  customerId: string
) {
  const [invoices, openOrders] = await Promise.all([
    prisma.stockDocument.findMany({
      where: {
        companyId,
        type: "INVOICE",
        paymentStatus: { in: ["UNPAID", "PARTIAL"] },
        salesOrder: { customerId },
      },
      select: { total: true, paidAmount: true },
    }),
    prisma.salesOrder.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ["OPEN", "PARTIAL", "FULFILLED", "PACKED"] },
        documents: { none: { type: "INVOICE" } },
      },
      include: { lines: true },
    }),
  ]);

  const unpaidInvoices = invoices.reduce(
    (s, d) => s + Math.max(0, d.total - (d.paidAmount || 0)),
    0
  );
  const openOrdersTotal = openOrders.reduce(
    (s, o) => s + orderLinesTotal(o.lines, o.vatRate),
    0
  );

  return {
    unpaidInvoices: round2(unpaidInvoices),
    openOrdersTotal: round2(openOrdersTotal),
    exposure: round2(unpaidInvoices + openOrdersTotal),
  };
}

export async function assertCustomerCredit(params: {
  companyId: string;
  customerId: string;
  additionalAmount: number;
  /** אם true — מאפשרים גם כשאין creditLimit */
  allowUnlimited?: boolean;
}) {
  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, companyId: params.companyId },
    select: { id: true, name: true, creditLimit: true, active: true },
  });
  if (!customer) throw new CreditError("לקוח לא נמצא");
  if (!customer.active) throw new CreditError("לקוח לא פעיל");

  if (customer.creditLimit == null) {
    if (params.allowUnlimited !== false) {
      return { customer, exposure: 0, creditLimit: null as number | null, ok: true };
    }
  }

  const { exposure } = await getCustomerCreditExposure(
    params.companyId,
    params.customerId
  );
  const limit = customer.creditLimit;
  if (limit == null) {
    return { customer, exposure, creditLimit: null, ok: true };
  }

  const projected = round2(exposure + Math.max(0, params.additionalAmount));
  if (projected > limit + 0.009) {
    throw new CreditError(
      `חריגת אשראי ל־${customer.name}: חשיפה ${formatMoney(projected)} ₪ מעל תקרה ${formatMoney(limit)} ₪ (נוכחי ${formatMoney(exposure)} ₪)`
    );
  }

  return { customer, exposure, creditLimit: limit, ok: true, projected };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number) {
  return n.toLocaleString("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
