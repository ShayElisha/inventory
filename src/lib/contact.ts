/** מנרמל טלפון לספרות בלבד (עם קידומת בינלאומית אופציונלית) */
export function normalizePhone(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  // ישראל: 05xxxxxxxx → 9725xxxxxxxx
  if (!hasPlus && digits.startsWith("0") && digits.length >= 9) {
    return `972${digits.slice(1)}`;
  }
  if (hasPlus || digits.startsWith("972")) return digits.startsWith("972") ? digits : digits;
  return digits;
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  if (phone.startsWith("972") && phone.length >= 11) {
    return `0${phone.slice(3)}`;
  }
  return phone;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

/** מזהה אם הקלט הוא אימייל או טלפון */
export function detectLoginKind(identifier: string): "email" | "phone" | null {
  const v = identifier.trim();
  if (!v) return null;
  if (isEmail(v)) return "email";
  if (looksLikePhone(v)) return "phone";
  return null;
}

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}
