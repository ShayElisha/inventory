export type NotifyTemplateId =
  | "LOW_STOCK"
  | "REORDER"
  | "PICK_READY"
  | "PUTAWAY"
  | "PAYMENT_DUE"
  | "COUNT_OPEN"
  | "DAILY_DIGEST";

export const NOTIFICATION_TEMPLATES: Record<
  NotifyTemplateId,
  { subject: string; body: (vars: Record<string, string | number>) => string }
> = {
  LOW_STOCK: {
    subject: "Sfira · מלאי נמוך",
    body: (v) =>
      `שלום,\n\n${v.detail || "יש פריטים מתחת לסף התראה."}\n\nפתיחה: ${v.href || "/products?lowStock=1"}\n`,
  },
  REORDER: {
    subject: "Sfira · הצעות רכש",
    body: (v) =>
      `שלום,\n\n${v.detail || "יש פריטים לרכש."}\n\nצרו PO: ${v.href || "/reorder"}\n`,
  },
  PICK_READY: {
    subject: "Sfira · ליקוט ממתין",
    body: (v) =>
      `שלום,\n\nרשימת ליקוט ממתינה: ${v.detail || ""}\n\n${v.href || "/picks"}\n`,
  },
  PUTAWAY: {
    subject: "Sfira · השמה למדף",
    body: (v) =>
      `שלום,\n\n${v.detail || "יש פריטים להשמה."}\n\n${v.href || "/putaway"}\n`,
  },
  PAYMENT_DUE: {
    subject: "Sfira · גבייה ממתינה",
    body: (v) =>
      `שלום,\n\n${v.detail || "יש חשבוניות פתוחות."}\n\n${v.href || "/documents?payment=open"}\n`,
  },
  COUNT_OPEN: {
    subject: "Sfira · ספירה פתוחה",
    body: (v) =>
      `שלום,\n\nספירה פתוחה: ${v.detail || ""}\n\n${v.href || "/counts"}\n`,
  },
  DAILY_DIGEST: {
    subject: "Sfira · סיכום יומי",
    body: (v) =>
      `שלום,\n\nסיכום יומי לחברה ${v.companyName || ""}:\n` +
      `• ליקוטים פתוחים: ${v.openPicks ?? 0}\n` +
      `• מלאי נמוך: ${v.lowStock ?? 0}\n` +
      `• חשבוניות בחוב: ${v.unpaid ?? 0}\n` +
      `• השמות ממתינות: ${v.putaway ?? 0}\n\n` +
      `דשבורד: ${v.href || "/dashboard"}\n`,
  },
};

export function renderNotifyTemplate(
  id: NotifyTemplateId,
  vars: Record<string, string | number> = {}
) {
  const t = NOTIFICATION_TEMPLATES[id];
  return { subject: t.subject, text: t.body(vars) };
}
