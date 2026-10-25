export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  WAREHOUSE: "WAREHOUSE",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "סופר אדמין",
  ADMIN: "מנהל",
  WAREHOUSE: "מחסנאי",
  VIEWER: "צופה",
};

export const COMPANY_ROLES = [ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.VIEWER] as const;

export const OUTBOUND_REASONS = [
  { code: "SALE", label: "מכירה" },
  { code: "WASTE", label: "פחת" },
  { code: "DAMAGE", label: "נזק" },
  { code: "RETURN", label: "החזרה לספק" },
  { code: "TRANSFER_OUT", label: "העברה החוצה" },
  { code: "OTHER", label: "אחר" },
] as const;

export const UNIT_OF_MEASURE = [
  { code: "UNIT", label: "יח׳" },
  { code: "CARTON", label: "קרטון" },
  { code: "SQM", label: "מ״ר" },
  { code: "KG", label: "ק״ג" },
  { code: "LITER", label: "ליטר" },
  { code: "METER", label: "מטר" },
  { code: "PAIR", label: "זוג" },
  { code: "SET", label: "סט" },
] as const;

export const PO_STATUSES = [
  { code: "DRAFT", label: "טיוטה" },
  { code: "ORDERED", label: "הוזמן" },
  { code: "PARTIAL", label: "קליטה חלקית" },
  { code: "RECEIVED", label: "נקלט במלואו" },
  { code: "CANCELLED", label: "בוטל" },
] as const;

export const SO_STATUSES = [
  { code: "OPEN", label: "פתוח" },
  { code: "PARTIAL", label: "ניפוק חלקי" },
  { code: "FULFILLED", label: "סופק" },
  { code: "PACKED", label: "ארוז" },
  { code: "SHIPPED", label: "יצא" },
  { code: "CANCELLED", label: "בוטל" },
] as const;

export const RMA_STATUSES = [
  { code: "OPEN", label: "פתוח" },
  { code: "RECEIVED", label: "התקבל" },
  { code: "INSPECTED", label: "נבדק" },
  { code: "CREDITED", label: "זוכה" },
  { code: "REJECTED", label: "נדחה" },
  { code: "CANCELLED", label: "בוטל" },
] as const;

export const RMA_REASONS = [
  { code: "DAMAGE", label: "נזק" },
  { code: "WRONG_ITEM", label: "פריט שגוי" },
  { code: "CUSTOMER_CHANGE", label: "שינוי דעת לקוח" },
  { code: "OTHER", label: "אחר" },
] as const;

export const RMA_CONDITIONS = [
  { code: "UNKNOWN", label: "לא ידוע" },
  { code: "SELLABLE", label: "ניתן למכירה" },
  { code: "DAMAGED", label: "פגום" },
  { code: "REFURBISH", label: "לשיפוץ" },
] as const;

export function unitLabel(code: string) {
  return UNIT_OF_MEASURE.find((u) => u.code === code)?.label ?? code;
}

export function reasonLabel(code: string | null | undefined) {
  if (!code) return "";
  return OUTBOUND_REASONS.find((r) => r.code === code)?.label ?? code;
}
