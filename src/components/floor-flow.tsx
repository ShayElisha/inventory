"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { readJson } from "@/lib/fetch-json";
import { CheckCircle2, Loader2 } from "lucide-react";

type VariantPayload = {
  id: string;
  sku: string;
  barcode: string;
  attributes: string;
  quantityOnHand: number;
  quantityReserved?: number;
  product: { title: string };
  location: { code: string } | null;
};

function useScanFocus(deps: unknown[] = []) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

async function lookupVariant(q: string): Promise<{
  match: string;
  variants: VariantPayload[];
}> {
  const res = await fetch(`/api/variants/lookup?q=${encodeURIComponent(q)}`);
  const data = await readJson<{
    error?: string;
    match?: string;
    variants?: VariantPayload[];
  }>(res);
  if (!res.ok) throw new Error(data.error || "לא נמצא");
  return {
    match: data.match || "multi",
    variants: data.variants || [],
  };
}

function VariantCard({ v }: { v: VariantPayload }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="font-semibold leading-snug">{v.product.title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {v.sku}
        {attributesLabel(v.attributes) ? ` · ${attributesLabel(v.attributes)}` : ""}
      </p>
      <p className="mt-1 text-sm">
        מלאי: <strong>{v.quantityOnHand}</strong>
        {v.location?.code ? ` · מדף ${v.location.code}` : ""}
      </p>
    </div>
  );
}

/** קליטה — סריקה → כמות → מדף → אישור */
export function FloorReceive({
  locations,
}: {
  locations: { id: string; code: string }[];
}) {
  const scanRef = useScanFocus([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantPayload[]>([]);
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [qty, setQty] = useState("1");
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function onScan(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    setDone("");
    setVariant(null);
    try {
      const data = await lookupVariant(q);
      if (data.match === "exact" && data.variants.length === 1) {
        setVariant(data.variants[0]);
        setResults([]);
        setQuery("");
      } else {
        setResults(data.variants);
      }
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
          reason: "קליטה — רצפת מחסן",
          locationId: locationId || null,
        }),
      });
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setDone(`נקלטו ${qty} יח׳ · ${variant.product.title}`);
      setVariant(null);
      setQty("1");
      setQuery("");
      setTimeout(() => scanRef.current?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">קליטה</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          סרקו ברקוד → הזינו כמות → בחרו מדף
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onScan(query);
        }}
        className="space-y-2"
      >
        <Label>סריקה / חיפוש</Label>
        <Input
          ref={scanRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ברקוד או מק״ט"
          inputMode="none"
          autoComplete="off"
          className="h-14 text-lg"
          disabled={busy}
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !query.trim()}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "חפש"}
        </Button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="w-full text-right"
                onClick={() => {
                  setVariant(v);
                  setResults([]);
                  setQuery("");
                }}
              >
                <VariantCard v={v} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {variant && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <VariantCard v={variant} />
          <div>
            <Label>כמות</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-14 text-lg"
            />
          </div>
          <div>
            <Label>מדף יעד</Label>
            <Select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-12"
            >
              <option value="">ללא שינוי מיקום</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            אשר קליטה
          </Button>
        </form>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {done}
        </p>
      )}
    </div>
  );
}

/** מדף — סריקת מוצר → סריקת קוד מדף */
export function FloorShelf() {
  const scanRef = useScanFocus([]);
  const [step, setStep] = useState<"product" | "shelf">("product");
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function handleScan(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      if (step === "product") {
        const data = await lookupVariant(q);
        if (!data.variants.length) throw new Error("לא נמצא");
        const v = data.variants[0];
        setVariant(v);
        setStep("shelf");
        setCode("");
        setDone("סרקו עכשיו את קוד המדף");
      } else {
        if (!variant) throw new Error("בחרו מוצר קודם");
        const res = await fetch("/api/stock/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId: variant.id,
            locationCode: q,
          }),
        });
        const data = await readJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(data.error || "שגיאה");
        setDone(`הועבר ל־${q}`);
        setVariant(null);
        setStep("product");
      }
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
      setTimeout(() => scanRef.current?.focus(), 50);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">העברה למדף</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {step === "product"
            ? "שלב 1: סרקו את המוצר"
            : "שלב 2: סרקו את קוד המדף"}
        </p>
      </div>

      <div className="flex gap-2">
        <span
          className={`flex-1 rounded-full py-2 text-center text-sm font-medium ${
            step === "product"
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "bg-[var(--surface-2)] text-[var(--muted)]"
          }`}
        >
          1 · מוצר
        </span>
        <span
          className={`flex-1 rounded-full py-2 text-center text-sm font-medium ${
            step === "shelf"
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "bg-[var(--surface-2)] text-[var(--muted)]"
          }`}
        >
          2 · מדף
        </span>
      </div>

      {variant && <VariantCard v={variant} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleScan(code);
        }}
        className="space-y-2"
      >
        <Label>{step === "product" ? "ברקוד מוצר" : "קוד מדף"}</Label>
        <Input
          ref={scanRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={step === "product" ? "סרקו מוצר" : "סרקו מדף"}
          inputMode="none"
          autoComplete="off"
          className="h-14 text-lg"
          disabled={busy}
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !code.trim()}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "המשך"}
        </Button>
      </form>

      {step === "shelf" && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStep("product");
            setVariant(null);
            setCode("");
          }}
        >
          ביטול — חזרה למוצר
        </Button>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {done}
        </p>
      )}
    </div>
  );
}

/** ניפוק — סריקה → כמות → סיבה */
export function FloorPick() {
  const scanRef = useScanFocus([]);
  const qtyRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantPayload[]>([]);
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [qty, setQty] = useState("1");
  const [reasonCode, setReasonCode] = useState("SALE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function onScan(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    setError("");
    setDone("");
    setVariant(null);
    try {
      const data = await lookupVariant(q);
      if (data.match === "exact" && data.variants.length === 1) {
        setVariant(data.variants[0]);
        setResults([]);
        setQuery("");
        setTimeout(() => qtyRef.current?.select(), 50);
      } else {
        setResults(data.variants);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!variant) return;
    const quantity = Number(qty);
    if (!quantity || quantity < 1) {
      setError("כמות לא תקינה");
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
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setDone(`נופקו ${quantity} יח׳ · ${variant.product.title}`);
      setVariant(null);
      setQty("1");
      setQuery("");
      setTimeout(() => scanRef.current?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ניפוק</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          סרקו → כמות → אשר יציאה
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onScan(query);
        }}
        className="space-y-2"
      >
        <Label>סריקה / חיפוש</Label>
        <Input
          ref={scanRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ברקוד או מק״ט"
          inputMode="none"
          autoComplete="off"
          className="h-14 text-lg"
          disabled={busy}
        />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !query.trim()}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "חפש"}
        </Button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="w-full text-right"
                onClick={() => {
                  setVariant(v);
                  setResults([]);
                  setQuery("");
                  setTimeout(() => qtyRef.current?.select(), 50);
                }}
              >
                <VariantCard v={v} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {variant && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <VariantCard v={variant} />
          <div>
            <Label>כמות</Label>
            <Input
              ref={qtyRef}
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-14 text-lg"
            />
          </div>
          <div>
            <Label>סיבה</Label>
            <Select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="h-12"
            >
              {OUTBOUND_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="lg" variant="lime" className="w-full" disabled={busy}>
            אשר ניפוק
          </Button>
        </form>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {done}
        </p>
      )}
    </div>
  );
}
