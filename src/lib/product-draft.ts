/** שמירת טיוטת טופס מוצר בדפדפן — אם נקטעה העבודה אפשר לחזור */

export const PRODUCT_DRAFT_KEY = "sfira-product-draft";

export type ProductDraft = {
  savedAt: number;
  step: number;
  title: string;
  baseSku: string;
  description: string;
  categoryId: string;
  supplierId: string;
  costPrice: string;
  sellingPrice: string;
  unitOfMeasure: string;
  unitsPerCarton: string;
  weightKg: string;
  volumeLiters: string;
  trackLots: boolean;
  trackSerials: boolean;
  isKit: boolean;
  multiSizes: boolean;
  attrOptions: Record<string, string>;
  defaultVariantQty: string;
  simpleBarcode: string;
  simpleQty: string;
  simpleLocationId: string;
  simpleMinAlert?: string;
  imageUrl: string;
  customValues: Record<string, string>;
};

export function loadProductDraft(): ProductDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductDraft;
    if (!parsed || typeof parsed !== "object") return null;
    // טיוטה ישנה מ־7 ימים נזרקת
    if (Date.now() - (parsed.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PRODUCT_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveProductDraft(draft: Omit<ProductDraft, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PRODUCT_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch {
    /* quota */
  }
}

export function clearProductDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PRODUCT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
