import { Role, ROLES } from "@/lib/constants";

export const PERMISSIONS = [
  { key: "stock.read", label: "צפייה במלאי" },
  { key: "stock.write", label: "עדכון מלאי / סריקה" },
  { key: "sales.write", label: "הזמנות ומסמכי מכירה" },
  { key: "purchases.write", label: "רכש וקליטה" },
  { key: "shipments.write", label: "משלוחים" },
  { key: "reports.view", label: "דוחות" },
  { key: "team.manage", label: "ניהול עובדים" },
  { key: "integrations.manage", label: "אינטגרציות ו־API" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

const ALL = PERMISSIONS.map((p) => p.key);

const ROLE_DEFAULTS: Record<string, PermissionKey[]> = {
  [ROLES.SUPER_ADMIN]: ALL,
  [ROLES.ADMIN]: ALL,
  [ROLES.WAREHOUSE]: [
    "stock.read",
    "stock.write",
    "sales.write",
    "purchases.write",
    "shipments.write",
  ],
  [ROLES.VIEWER]: ["stock.read", "reports.view"],
};

export function parsePermissionsJson(raw: string | null | undefined): PermissionKey[] | null {
  if (!raw || raw === "null") return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    const allowed = new Set(ALL);
    return v.filter((x): x is PermissionKey => allowed.has(x));
  } catch {
    return null;
  }
}

export function permissionsForRole(role: Role | string): PermissionKey[] {
  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS[ROLES.VIEWER];
}

/** הרשאות אפקטיביות: override מפורש על המשתמש, אחרת ברירת תפקיד */
export function effectivePermissions(
  role: Role | string,
  permissionsJson?: string | null
): PermissionKey[] {
  if (role === ROLES.SUPER_ADMIN) return ALL;
  const override = parsePermissionsJson(permissionsJson);
  if (override) return override;
  return permissionsForRole(role);
}

export function hasPermission(
  role: Role | string,
  key: PermissionKey,
  permissionsJson?: string | null
) {
  return effectivePermissions(role, permissionsJson).includes(key);
}

/** תואם ל־canWrite הישן + הרשאות דקות */
export function canWriteStock(
  role: Role | string,
  permissionsJson?: string | null
) {
  return hasPermission(role, "stock.write", permissionsJson);
}
