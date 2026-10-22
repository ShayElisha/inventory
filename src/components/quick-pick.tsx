"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { PackageMinus, MapPin, Search } from "lucide-react";

type VariantPayload = {
  id: string;
  sku: string;
  barcode: string;
  attributes: string;
  quantityOnHand: number;
  quantityReserved: number;
  minAlertLevel: number;
  product: { title: string; baseSku?: string };
  location: { code: string } | null;
};

export function QuickPick() {
  const scanRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantPayload[]>([]);
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [qty, setQty] = useState("1");
  const [reasonCode, setReasonCode] = useState("SALE");
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
    setError("");
    setTimeout(() => qtyRef.current?.select(), 50);
  }

  async function search(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setError("");
    setToast("");
    setBusy(true);
    setResults([]);
    setVariant(null);
    try {
      const res = await fetch(`/api/variants/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "לא נמצא");

      const list = (data.variants || []) as VariantPayload[];
      if (data.match === "exact" && list.length === 1) {
        selectVariant(list[0]);
      } else {
        setResults(list);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
      scanRef.current?.select();
    } finally {
      setBusy(false);
    }
  }

  async function pick(e?: React.FormEvent) {
    e?.preventDefault();
    if (!variant) return;
    const quantity = Number(qty);
    if (!quantity || quantity < 1) {
      setError("יש להזין כמות חיובית");
      return;
    }
    if (quantity > variant.quantityOnHand) {
      setError(`אין מספיק מלאי (זמין: ${variant.quantityOnHand})`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          quantity,
          reasonCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בניפוק");

      const left = data.variant.quantityOnHand as number;
      setToast(`נופקו ${quantity} יח׳ מ־${variant.product.title} · נותר ${left}`);
      setVariant(null);
      setResults([]);
      setQty("1");
      setQuery("");
      setTimeout(() => scanRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  const available = variant
    ? variant.quantityOnHand - variant.quantityReserved
    : 0;

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
            placeholder="למשל: חולצה / TS-100 / ברקוד"
            className="h-14 text-center text-lg"
            autoComplete="off"
            disabled={busy}
          />
          <Button type="submit" className="w-full" size="lg" disabled={busy || !query.trim()}>
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
        <Card className="space-y-2 p-3">
          <p className="px-2 text-sm text-[var(--muted)]">{results.length} תוצאות — בחרו פריט</p>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {results.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => selectVariant(v)}
                  className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-3 text-right hover:bg-[var(--accent-soft)]"
                >
                  <span className="font-semibold text-[var(--foreground)]">{v.product.title}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {v.sku}
                    {attributesLabel(v.attributes) !== "ללא אפשרויות"
                      ? ` · ${attributesLabel(v.attributes)}`
                      : ""}
                    {" · "}
                    מלאי {v.quantityOnHand}
                    {v.location?.code ? ` · ${v.location.code}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {variant && (
        <Card className="space-y-5">
          <div>
            <div className="text-xs text-[var(--muted)] font-mono">{variant.sku}</div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">{variant.product.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {attributesLabel(variant.attributes)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {variant.location?.code ?? "ללא מיקום"}
              </span>
              <span>
                במלאי: <strong className="text-[var(--foreground)]">{variant.quantityOnHand}</strong>
                {variant.quantityReserved > 0 && (
                  <>
                    {" "}
                    · פנוי: <strong>{available}</strong>
                  </>
                )}
              </span>
            </div>
          </div>

          <form onSubmit={pick} className="space-y-4">
            <div>
              <Label>סיבת ניפוק</Label>
              <Select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                {OUTBOUND_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>כמה להוציא?</Label>
              <Input
                ref={qtyRef}
                type="number"
                min={1}
                max={variant.quantityOnHand}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-16 text-center text-3xl font-bold"
                inputMode="numeric"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQty(String(Math.min(n, variant.quantityOnHand)))}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQty(String(variant.quantityOnHand))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
                >
                  הכל ({variant.quantityOnHand})
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              variant="danger"
              className="h-16 w-full text-lg"
              disabled={busy}
            >
              <PackageMinus className="h-5 w-5" />
              {busy ? "מנפק..." : `נפק ${qty || "?"} יח׳`}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-[var(--muted)] underline"
              onClick={() => {
                setVariant(null);
                setResults([]);
                setError("");
                scanRef.current?.focus();
              }}
            >
              בטל — מוצר אחר
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
