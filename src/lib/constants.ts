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
] as const;

export function unitLabel(code: string) {
  return UNIT_OF_MEASURE.find((u) => u.code === code)?.label ?? code;
}

export function reasonLabel(code: string | null | undefined) {
  if (!code) return "";
  return OUTBOUND_REASONS.find((r) => r.code === code)?.label ?? code;
}
