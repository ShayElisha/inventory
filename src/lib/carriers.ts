/** שליחים נפוצים בישראל + תבניות מעקב */

export const CARRIERS = [
  {
    code: "CHEETAH",
    label: "צ׳יטה",
    trackingUrl: (ref: string) =>
      `https://www.cheetah.co.il/tracking?id=${encodeURIComponent(ref)}`,
  },
  {
    code: "HFD",
    label: "HFD",
    trackingUrl: (ref: string) =>
      `https://www.hfd.co.il/tracking/${encodeURIComponent(ref)}`,
  },
  {
    code: "SOS",
    label: "SOS",
    trackingUrl: (ref: string) =>
      `https://www.sos-express.co.il/?tracking=${encodeURIComponent(ref)}`,
  },
  {
    code: "ISRAEL_POST",
    label: "דואר ישראל",
    trackingUrl: (ref: string) =>
      `https://israelpost.co.il/itemtrace/?itemcode=${encodeURIComponent(ref)}`,
  },
  {
    code: "OTHER",
    label: "אחר",
    trackingUrl: (ref: string) => ref,
  },
] as const;

export function carrierLabel(code: string | null | undefined) {
  return CARRIERS.find((c) => c.code === code)?.label || code || "—";
}

export function trackingUrlFor(
  carrier: string | null | undefined,
  trackingRef: string | null | undefined
) {
  if (!trackingRef) return null;
  const c = CARRIERS.find((x) => x.code === carrier);
  if (!c || c.code === "OTHER") return null;
  return c.trackingUrl(trackingRef);
}

/**
 * עדכון סטטוס אוטומטי לפי זמן / webhook.
 * בלי חיבור חי לשליח — התקדמות סבירה לפי גיל המשלוח + אירועי webhook.
 */
export function inferTrackingStatus(params: {
  status: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  webhookStatus?: string | null;
  now?: Date;
}): {
  trackingStatus: string;
  shipmentStatus?: string;
} {
  if (params.webhookStatus) {
    const w = params.webhookStatus.toUpperCase();
    if (w === "DELIVERED") {
      return { trackingStatus: "DELIVERED", shipmentStatus: "DELIVERED" };
    }
    if (w === "OUT_FOR_DELIVERY" || w === "IN_TRANSIT") {
      return { trackingStatus: w, shipmentStatus: "SHIPPED" };
    }
    if (w === "EXCEPTION" || w === "FAILED") {
      return { trackingStatus: w };
    }
    return { trackingStatus: w };
  }

  if (params.status === "DELIVERED" || params.deliveredAt) {
    return { trackingStatus: "DELIVERED" };
  }
  if (params.status !== "SHIPPED" || !params.shippedAt) {
    return {
      trackingStatus:
        params.status === "PACKED"
          ? "PACKED"
          : params.status === "DRAFT"
            ? "DRAFT"
            : params.status,
    };
  }

  const now = params.now || new Date();
  const hours =
    (now.getTime() - params.shippedAt.getTime()) / (1000 * 60 * 60);
  if (hours >= 72) {
    return { trackingStatus: "DELIVERED", shipmentStatus: "DELIVERED" };
  }
  if (hours >= 24) {
    return { trackingStatus: "OUT_FOR_DELIVERY" };
  }
  return { trackingStatus: "IN_TRANSIT" };
}
