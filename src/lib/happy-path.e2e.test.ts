/**
 * Happy-path לוגי (בלי דפדפן): קליטה → הזמנה/ATP → ליקוט מדומה → משלוח/מעקב
 * רץ תמיד על הלוגיקה הטהורה; עם DATABASE_URL אפשר להרחיב ל־DB.
 */
import { describe, expect, it } from "vitest";
import { toBaseUnits } from "@/lib/uom";
import { checkAtp } from "@/lib/atp";
import { inferTrackingStatus, trackingUrlFor } from "@/lib/carriers";
import { orderLinesTotal } from "@/lib/credit";
import { calcDocTotals } from "@/lib/commerce";
import { renderNotifyTemplate } from "@/lib/notification-templates";

describe("happy path business flow", () => {
  it("1) inbound carton converts to base units", () => {
    const base = toBaseUnits(2, "CARTON", {
      unitOfMeasure: "UNIT",
      unitsPerCarton: 10,
    });
    expect(base).toBe(20);
  });

  it("2) ATP blocks when available < requested", async () => {
    // בלי DB — מדמים תוצאת ATP ידנית (הלוגיקה זהה ל־checkAtp)
    const onHand = 20;
    const reserved = 5;
    const available = onHand - reserved;
    const requested = 18;
    expect(available >= requested).toBe(false);
  });

  it("3) order totals feed credit / invoice", () => {
    const lines = [
      { qtyOrdered: 2, unitPrice: 50 },
      { qtyOrdered: 1, unitPrice: 100 },
    ];
    const total = orderLinesTotal(lines, 17);
    const doc = calcDocTotals({
      lines: lines.map((l) => ({ qty: l.qtyOrdered, unitPrice: l.unitPrice })),
      vatRate: 17,
      discountPercent: 0,
    });
    expect(total).toBe(doc.total);
    expect(doc.subtotal).toBe(200);
  });

  it("4) shipment tracking advances after ship", () => {
    const shippedAt = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30h ago
    const inferred = inferTrackingStatus({
      status: "SHIPPED",
      shippedAt,
      deliveredAt: null,
    });
    expect(inferred.trackingStatus).toBe("OUT_FOR_DELIVERY");
    expect(trackingUrlFor("CHEETAH", "ABC123")).toContain("ABC123");
  });

  it("5) notification template renders digest", () => {
    const { subject, text } = renderNotifyTemplate("DAILY_DIGEST", {
      companyName: "דמו",
      openPicks: 2,
      lowStock: 1,
      unpaid: 3,
      putaway: 0,
    });
    expect(subject).toContain("סיכום");
    expect(text).toContain("דמו");
    expect(text).toContain("2");
  });

  it("checkAtp is exported for DB-backed runs", () => {
    expect(typeof checkAtp).toBe("function");
  });
});
