"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { PackagePlus, Search } from "lucide-react";

type VariantPayload = {
  id: string;
  sku: string;
  barcode: string;
  attributes: string;
  quantityOnHand: number;
  product: { title: string };
  location: { code: string } | null;
};

export function QuickInbound({
  locations,
}: {
  locations: { id: string; code: string }[];
}) {
  const scanRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantPayload[]>([]);
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [qty, setQty] = useState("1");
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  function selectVariant(v: VariantPayload) {
    setVariant(v);
    setResults([]);
    setQuery("");
    setQty("1");
  }

  async function search(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    setToast("");
    setVariant(null);
    try {
      const res = await fetch(`/api/variants/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "לא נמצא");
      const list = data.variants || [];
      if (data.match === "exact" && list.length === 1) selectVariant(list[0]);
      else setResults(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variant) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          quantity: Number(qty),
          reason: "קליטה מהירה",
          locationId: locationId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setToast(`נקלטו ${qty} יח׳ ל־${variant.product.title}`);
      setVariant(null);
      setQuery("");
      scanRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="space-y-3"
        >
          <Label>שם מוצר, מק״ט או ברקוד</Label>
          <Input
            ref={scanRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 text-center text-lg"
            placeholder="חיפוש לקליטה"
          />
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            <Search className="h-4 w-4" />
            חפש
          </Button>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      {results.length > 0 && !variant && (
        <Card className="space-y-1 p-2">
          {results.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v)}
              className="w-full rounded-lg px-3 py-3 text-right hover:bg-[var(--accent-soft)]"
            >
              <div className="font-semibold">{v.product.title}</div>
              <div className="text-xs text-[var(--muted)]">
                {v.sku} · {attributesLabel(v.attributes)} · מלאי {v.quantityOnHand}
              </div>
            </button>
          ))}
        </Card>
      )}

      {variant && (
        <Card className="space-y-4">
          <div>
            <div className="text-xs font-mono text-[var(--muted)]">{variant.sku}</div>
            <h2 className="text-xl font-bold">{variant.product.title}</h2>
            <p className="text-sm text-[var(--muted)]">{attributesLabel(variant.attributes)}</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>כמות לקליטה</Label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-14 text-center text-2xl font-bold"
              />
            </div>
            <div>
              <Label>מיקום מדף</Label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">ללא שינוי</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" size="lg" className="h-14 w-full" disabled={busy}>
              <PackagePlus className="h-5 w-5" />
              קלוט {qty} יח׳
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
