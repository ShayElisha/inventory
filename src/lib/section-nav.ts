import type { SellableModuleId } from "@/lib/modules";

export type SectionTab = {
  href: string;
  label: string;
  /** אם מוגדר — מוצג רק כשהמודול פעיל */
  module?: SellableModuleId;
};

/** מלאי — קטלוג, מיקומים, תנועות ומעקב */
export const INVENTORY_TABS: SectionTab[] = [
  { href: "/products", label: "מוצרים" },
  { href: "/locations", label: "מיקומים" },
  { href: "/stock", label: "תנועות" },
  { href: "/lots", label: "אצוות", module: "lots" },
  { href: "/serials", label: "סריאליים", module: "serials" },
  { href: "/counts", label: "ספירה" },
  { href: "/scan", label: "סריקה" },
  { href: "/kits", label: "קיטים", module: "kits" },
];

/** רכש וקליטה */
export const PURCHASE_TABS: SectionTab[] = [
  { href: "/purchases", label: "הזמנות רכש" },
  { href: "/inbound", label: "קליטה" },
  { href: "/reorder", label: "הצעות רכש", module: "reorder" },
];

/** מכירות — הזמנות, לקוחות והחזרות */
export const SALES_TABS: SectionTab[] = [
  { href: "/orders", label: "הזמנות לקוח" },
  { href: "/customers", label: "לקוחות", module: "commerce" },
  { href: "/price-lists", label: "מחירונים", module: "commerce" },
  { href: "/returns", label: "החזרות", module: "returns" },
];

/** ניפוק, ליקוט, משלוח ומסמכים */
export const FULFILLMENT_TABS: SectionTab[] = [
  { href: "/pick", label: "ניפוק", module: "sales" },
  { href: "/picks", label: "ליקוט", module: "pick" },
  { href: "/shipments", label: "משלוחים", module: "shipments" },
  { href: "/documents", label: "מסמכים", module: "sales" },
];

export const SECTION_TAB_SETS = {
  inventory: INVENTORY_TABS,
  purchase: PURCHASE_TABS,
  sales: SALES_TABS,
  fulfillment: FULFILLMENT_TABS,
} as const;

export type SectionId = keyof typeof SECTION_TAB_SETS;
