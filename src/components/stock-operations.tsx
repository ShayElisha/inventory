"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { ADJUSTMENT_REASONS, OUTBOUND_REASONS } from "@/lib/constants";

type Variant = {
  id: string;
  sku: string;
  barcode: string;
  attributes: string;
  quantityOnHand: number;
  quantityReserved: number;
  product: { title: string };
  location: { code: string } | null;
};

const TABS = [
  { id: "inbound", label: "קליטה" },
  { id: "outbound", label: "ניפוק" },
  { id: "transfer", label: "העברה" },
  { id: "count", label: "תיקון מלאי" },
  { id: "reserve", label: "שמירה" },
] as const;

export function StockOperations({
  variants,
  locations,
}: {
  variants: Variant[];
  locations: { id: string; code: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("inbound");
  const [variantId, setVariantId] = useState(variants[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [releaseReserved, setReleaseReserved] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = variants.find((v) => v.id === variantId);

  async function submit() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (tab === "count") {
        if (!reasonCode) {
          throw new Error("חובה לבחור סיבה לתיקון המלאי");
        }
        if (counted === "" || Number.isNaN(Number(counted))) {
          throw new Error("הזינו את הכמות הנכונה במלאי");
        }
      }

      let url = "";
      let body: Record<string, unknown> = {};

      if (tab === "inbound") {
        url = "/api/stock/inbound";
        body = {
          variantId,
          quantity: Number(quantity),
          reason: reason || "קבלת סחורה",
          locationId,
          ...(lotCode ? { lotCode } : {}),
          ...(expiryDate ? { expiryDate } : {}),
        };
      } else if (tab === "outbound") {
        url = "/api/stock/outbound";
        body = {
          variantId,
          quantity: Number(quantity),
          reason: reason || "ניפוק מלאי",
          reasonCode: reasonCode || "SALE",
          releaseReserved,
        };
      } else if (tab === "transfer") {
        url = "/api/stock/transfer";
        body = {
          variantId,
          toLocationId: locationId,
          reason: reason || "העברת מיקום",
        };
      } else if (tab === "count") {
        const reasonLabel =
          ADJUSTMENT_REASONS.find((r) => r.code === reasonCode)?.label ||
          reasonCode;
        url = "/api/stock/adjust";
        body = {
          variantId,
          mode: "count",
          countedQuantity: Number(counted),
          reason: reason.trim() || reasonLabel,
          reasonCode,
        };
      } else {
        url = "/api/stock/reserve";
        body = {
          variantId,
          quantity: Number(quantity),
          reason: reason || "שמירה להזמנה",
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setMessage("הפעולה בוצעה בהצלחה");
      setCounted("");
      setReason("");
      if (tab === "count") setReasonCode("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  if (variants.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">
          אין פריטים במלאי. הוסיפו מוצרים ב{" "}
          <a
            href="/products/new"
            className="font-medium text-[var(--accent)] underline"
          >
            קטלוג
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setMessage("");
              setError("");
              setReasonCode(
                t.id === "count" ? "" : t.id === "outbound" ? "SALE" : ""
              );
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>בחירת פריט</Label>
          <Select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.product.title} · {v.sku} ({attributesLabel(v.attributes)}) ·
                מלאי {v.quantityOnHand}
              </option>
            ))}
          </Select>
          {selected && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              ברקוד: {selected.barcode} · מדף:{" "}
              {selected.location?.code ?? "—"} · שמור:{" "}
              {selected.quantityReserved}
            </p>
          )}
        </div>

        {tab !== "count" && tab !== "transfer" && (
          <div>
            <Label>כמות</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        )}

        {tab === "count" && (
          <div>
            <Label>כמות נכונה במלאי *</Label>
            <Input
              type="number"
              min="0"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder={
                selected ? `נוכחי במערכת: ${selected.quantityOnHand}` : ""
              }
              required
            />
          </div>
        )}

        {(tab === "inbound" || tab === "transfer") && (
          <div>
            <Label>{tab === "transfer" ? "מדף יעד" : "מדף"}</Label>
            <Select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
            </Select>
          </div>
        )}

        {tab === "inbound" && (
          <>
            <div>
              <Label>קוד אצווה (אופציונלי)</Label>
              <Input
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                placeholder="למשל LOT-2410"
              />
            </div>
            <div>
              <Label>תאריך תוקף (אופציונלי)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </>
        )}

        {tab === "outbound" && (
          <>
            <div>
              <Label>סיבת ניפוק</Label>
              <Select
                value={reasonCode || "SALE"}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                {OUTBOUND_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={releaseReserved}
                  onChange={(e) => setReleaseReserved(e.target.checked)}
                />
                שחרר גם מכמות שמורה
              </label>
            </div>
          </>
        )}

        {tab === "count" && (
          <div>
            <Label>סיבה לתיקון *</Label>
            <Select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              required
            >
              <option value="">בחרו סיבה…</option>
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="sm:col-span-2">
          <Label>
            {tab === "count" ? "הערה נוספת (אופציונלי)" : "הערה"}
          </Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              tab === "inbound"
                ? "קבלת מכולה / הזמנת רכש"
                : tab === "outbound"
                  ? "סיבת הניפוק (מכירה / פחת / נזק…)"
                  : tab === "count"
                    ? "פירוט נוסף לתיקון"
                    : "סיבת הפעולה"
            }
          />
        </div>

        <div className="sm:col-span-2">
          <Button onClick={submit} disabled={loading}>
            {loading ? "מבצע..." : "אשר פעולה"}
          </Button>
        </div>
      </Card>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
    </div>
  );
}
