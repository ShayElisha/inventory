import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

/** שולח אירועים ל־webhook endpoints פעילים של החברה (fire-and-forget) */
export async function dispatchWebhooks(
  companyId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { companyId, active: true },
  });
  const body = JSON.stringify({
    event,
    sentAt: new Date().toISOString(),
    data: payload,
  });

  await Promise.allSettled(
    endpoints.map(async (ep) => {
      let events: string[] = [];
      try {
        events = JSON.parse(ep.events || "[]");
      } catch {
        events = [];
      }
      if (events.length && !events.includes(event) && !events.includes("*")) {
        return;
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Sfira-Event": event,
      };
      if (ep.secret) {
        headers["X-Sfira-Signature"] = createHmac("sha256", ep.secret)
          .update(body)
          .digest("hex");
      }
      await fetch(ep.url, { method: "POST", headers, body });
    })
  );
}
