"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";

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
  { id: "count", label: "ספירה" },
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
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [releaseReserved, setReleaseReserved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = variants.find((v) => v.id === variantId);

  async function submit() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      let url = "";
      let body: Record<string, unknown> = {};

      if (tab === "inbound") {
        url = "/api/stock/inbound";
        body = {
          variantId,
          quantity: Number(quantity),
          reason: reason || "קבלת סחורה",
          locationId,
        };
      } else if (tab === "outbound") {
        url = "/api/stock/outbound";
        body = {
          variantId,
          quantity: Number(quantity),
          reason: reason || "ליקוט / מכירה",
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
        url = "/api/stock/adjust";
        body = {
          variantId,
          mode: "count",
          countedQuantity: Number(counted),
          reason: reason || "ספירה תקופתית",
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
        <p className="text-sm text-slate-600">
          אין וריאציות במלאי. הוסיפו מוצרים ב{" "}
          <a href="/products/new" className="font-medium text-teal-700 underline">
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
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-teal-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>וריאציה / SKU</Label>
          <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku} — {v.product.title} ({attributesLabel(v.attributes)}) · מלאי{" "}
                {v.quantityOnHand}
              </option>
            ))}
          </Select>
          {selected && (
            <p className="mt-2 text-xs text-slate-500">
              ברקוד: {selected.barcode} · מיקום: {selected.location?.code ?? "—"} ·
              שמור: {selected.quantityReserved}
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
            <Label>כמות שנספרה</Label>
            <Input
              type="number"
              min="0"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder={selected ? `נוכחי: ${selected.quantityOnHand}` : ""}
            />
          </div>
        )}

        {(tab === "inbound" || tab === "transfer") && (
          <div>
            <Label>{tab === "transfer" ? "מיקום יעד" : "מיקום מדף"}</Label>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
            </Select>
          </div>
        )}

        {tab === "outbound" && (
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
        )}

        <div className={tab === "count" || tab === "outbound" ? "" : "sm:col-span-2"}>
          <Label>סיבה</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              tab === "inbound"
                ? "קבלת מכולה / הזמנת רכש"
                : tab === "outbound"
                  ? "ליקוט הזמנה / מכירה"
                  : tab === "count"
                    ? "ספירה תקופתית / פחת"
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
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
