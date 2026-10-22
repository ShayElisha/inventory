/** חישובי מסמכי מכירה / הנחות מדרגות / FEFO */

export type DiscountTier = { minQty: number; percent: number };

export function parseDiscountTiers(raw: string | null | undefined): DiscountTier[] {
  try {
    const v = JSON.parse(raw || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .map((t) => ({
        minQty: Number(t.minQty) || 0,
        percent: Number(t.percent) || 0,
      }))
      .filter((t) => t.minQty > 0 && t.percent > 0)
      .sort((a, b) => b.minQty - a.minQty);
  } catch {
    return [];
  }
}

export function discountPercentForQty(tiers: DiscountTier[], totalQty: number) {
  for (const t of tiers) {
    if (totalQty >= t.minQty) return t.percent;
  }
  return 0;
}

export function calcDocTotals(params: {
  lines: { qty: number; unitPrice: number }[];
  vatRate: number;
  discountPercent: number;
}) {
  const subtotal = params.lines.reduce(
    (s, l) => s + l.qty * l.unitPrice,
    0
  );
  const afterDiscount = subtotal * (1 - params.discountPercent / 100);
  const vatAmount = afterDiscount * (params.vatRate / 100);
  return {
    subtotal: round2(subtotal),
    discountPercent: params.discountPercent,
    afterDiscount: round2(afterDiscount),
    vatAmount: round2(vatAmount),
    total: round2(afterDiscount + vatAmount),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function poStatusAfterReceive(qtyOrdered: number, qtyReceived: number) {
  if (qtyReceived <= 0) return "ORDERED";
  if (qtyReceived >= qtyOrdered) return "RECEIVED";
  return "PARTIAL";
}

export function soStatusAfterFulfill(qtyOrdered: number, qtyFulfilled: number) {
  if (qtyFulfilled <= 0) return "OPEN";
  if (qtyFulfilled >= qtyOrdered) return "FULFILLED";
  return "PARTIAL";
}
