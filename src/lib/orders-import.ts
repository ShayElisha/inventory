import { prisma } from "@/lib/db";
import { normalizeHeader } from "@/lib/csv-parse";

export type ImportSalesOrderRow = {
  customerName: string;
  sku: string;
  quantity: number;
  unitPrice?: number;
  orderNumber?: string | null;
  priority?: number;
};

const HEADER_MAP: Record<string, keyof ImportSalesOrderRow> = {
  customer: "customerName",
  customername: "customerName",
  לקוח: "customerName",
  שםלקוח: "customerName",
  sku: "sku",
  מקט: "sku",
  quantity: "quantity",
  qty: "quantity",
  כמות: "quantity",
  unitprice: "unitPrice",
  price: "unitPrice",
  מחיר: "unitPrice",
  ordernumber: "orderNumber",
  number: "orderNumber",
  הזמנה: "orderNumber",
  priority: "priority",
  עדיפות: "priority",
};

export function mapSalesOrderHeaders(raw: string[]) {
  return raw.map((h) => HEADER_MAP[normalizeHeader(h)] || null);
}

export function salesOrderRowFromValues(
  headers: (keyof ImportSalesOrderRow | null)[],
  values: unknown[],
  rowNum: number
): ImportSalesOrderRow | { error: string } {
  const get = (key: keyof ImportSalesOrderRow) => {
    const idx = headers.indexOf(key);
    if (idx < 0) return "";
    return String(values[idx] ?? "").trim();
  };
  const customerName = get("customerName");
  const sku = get("sku");
  const quantity = Math.max(1, Number(get("quantity")) || 0);
  if (!customerName) return { error: `שורה ${rowNum}: חסר לקוח` };
  if (!sku) return { error: `שורה ${rowNum}: חסר SKU` };
  if (!quantity) return { error: `שורה ${rowNum}: כמות לא תקינה` };
  const unitPriceRaw = get("unitPrice");
  const priorityRaw = get("priority");
  return {
    customerName,
    sku,
    quantity,
    unitPrice:
      unitPriceRaw === ""
        ? undefined
        : Number(unitPriceRaw.replace(/,/g, "")) || 0,
    orderNumber: get("orderNumber") || null,
    priority: priorityRaw ? Number(priorityRaw) || 3 : 3,
  };
}

/** מקבץ שורות לפי מספר הזמנה / לקוח ויוצר SalesOrder-ים */
export async function importSalesOrderRows(
  companyId: string,
  userId: string,
  rows: ImportSalesOrderRow[]
) {
  let created = 0;
  let linesCreated = 0;
  const errors: string[] = [];

  const groups = new Map<string, ImportSalesOrderRow[]>();
  for (const row of rows) {
    const key =
      row.orderNumber?.trim() ||
      `AUTO-${row.customerName}-${row.priority || 3}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  for (const [key, group] of groups) {
    try {
      const customerName = group[0].customerName;
      const customer = await prisma.customer.findFirst({
        where: { companyId, name: customerName, active: true },
      });

      const lineData: {
        variantId: string;
        qtyOrdered: number;
        unitPrice: number;
      }[] = [];

      for (const row of group) {
        const variant = await prisma.productVariant.findFirst({
          where: { companyId, sku: row.sku },
          include: { product: true },
        });
        if (!variant) {
          errors.push(`${key}: SKU ${row.sku} לא נמצא`);
          continue;
        }
        lineData.push({
          variantId: variant.id,
          qtyOrdered: row.quantity,
          unitPrice:
            row.unitPrice != null
              ? row.unitPrice
              : variant.product.sellingPrice || 0,
        });
      }

      if (!lineData.length) continue;

      const number =
        group[0].orderNumber?.trim() ||
        `SO-IMP-${Date.now().toString(36).toUpperCase()}-${created + 1}`;

      const existing = await prisma.salesOrder.findFirst({
        where: { companyId, number },
      });
      if (existing) {
        errors.push(`${number}: מספר הזמנה כבר קיים`);
        continue;
      }

      await prisma.salesOrder.create({
        data: {
          companyId,
          number,
          customerId: customer?.id || null,
          customerName,
          customerPhone: customer?.phone || null,
          priority: Math.min(5, Math.max(1, group[0].priority || 3)),
          createdById: userId,
          notes: "יובא מקובץ",
          lines: { create: lineData },
        },
      });
      created++;
      linesCreated += lineData.length;
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : "שגיאה"}`);
    }
  }

  return { created, linesCreated, errors };
}
