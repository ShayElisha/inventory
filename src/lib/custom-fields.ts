export const CUSTOM_FIELD_TYPES = [
  { code: "TEXT", label: "טקסט" },
  { code: "NUMBER", label: "מספר" },
  { code: "DATE", label: "תאריך" },
  { code: "SELECT", label: "בחירה מרשימה" },
  { code: "BOOLEAN", label: "כן/לא" },
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]["code"];

export function fieldKeyFromLabel(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || `field_${Date.now().toString(36)}`;
}

export function parseCustomData(raw: string | null | undefined): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function parseFieldOptions(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
