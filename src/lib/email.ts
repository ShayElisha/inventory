/**
 * שליחת אימייל אופציונלית דרך webhook.
 * הגדירו EMAIL_WEBHOOK_URL (POST JSON: { to, subject, text, companyId? }).
 */
export async function sendEmailIfConfigured(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  companyId?: string;
  templateId?: string;
}) {
  const url = process.env.EMAIL_WEBHOOK_URL?.trim();
  if (!url || !params.to) return { sent: false as const, reason: "not_configured" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html || undefined,
        templateId: params.templateId,
        companyId: params.companyId,
      }),
    });
    if (!res.ok) {
      console.error("email webhook failed", res.status);
      return { sent: false as const, reason: "webhook_error" };
    }
    return { sent: true as const };
  } catch (e) {
    console.error("email webhook error", e);
    return { sent: false as const, reason: "webhook_error" };
  }
}
