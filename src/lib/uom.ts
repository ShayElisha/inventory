import { UNIT_OF_MEASURE } from "@/lib/constants";

export type UomCode = (typeof UNIT_OF_MEASURE)[number]["code"] | string;

export type UomProduct = {
  unitOfMeasure: string;
  unitsPerCarton: number;
  /** גורם המרה ליחידת בסיס (UNIT) — ברירת מחדל 1 */
  conversionToBase?: number | null;
};

/**
 * ממיר כמות ביחידת הצגה ליחידות בסיס במלאי (UNIT).
 * CARTON → × unitsPerCarton; אחרת × conversionToBase או 1.
 */
export function toBaseUnits(
  quantity: number,
  inputUom: UomCode | null | undefined,
  product: UomProduct
): number {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  const uom = String(inputUom || product.unitOfMeasure || "UNIT").toUpperCase();

  if (uom === "CARTON") {
    const per = Math.max(1, Number(product.unitsPerCarton) || 1);
    return Math.round(qty * per);
  }
  if (uom === "UNIT" || uom === product.unitOfMeasure?.toUpperCase()) {
    const factor = Math.max(0.0001, Number(product.conversionToBase) || 1);
    // אם היחידה הראשית של המוצר אינה UNIT — quantity כבר באותה יחידה
    if (product.unitOfMeasure?.toUpperCase() === "UNIT" || uom === "UNIT") {
      return Math.round(qty);
    }
    return Math.round(qty * factor);
  }
  // יחידה זרה → מניחים 1:1 ליחידת בסיס
  return Math.round(qty);
}

export function fromBaseUnits(
  baseQty: number,
  outputUom: UomCode | null | undefined,
  product: UomProduct
): number {
  const qty = Number(baseQty);
  if (!Number.isFinite(qty)) return 0;
  const uom = String(outputUom || "UNIT").toUpperCase();
  if (uom === "CARTON") {
    const per = Math.max(1, Number(product.unitsPerCarton) || 1);
    return Math.round((qty / per) * 1000) / 1000;
  }
  return qty;
}

export function describeUomConversion(
  quantity: number,
  inputUom: string,
  product: UomProduct
) {
  const base = toBaseUnits(quantity, inputUom, product);
  return {
    inputQty: quantity,
    inputUom,
    baseUnits: base,
    label:
      String(inputUom).toUpperCase() === "CARTON"
        ? `${quantity} קרטון = ${base} יח׳`
        : `${quantity} → ${base} יח׳ בסיס`,
  };
}
