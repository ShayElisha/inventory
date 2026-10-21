"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { Minus, Plus, MapPin } from "lucide-react";

type VariantPayload = {
  id: string;
  sku: string;
  barcode: string;
  attributes: string;
  quantityOnHand: number;
  quantityReserved: number;
  minAlertLevel: number;
  product: { title: string };
  location: { code: string } | null;
};

export function ScanConsole() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [mode, setMode] = useState<"product" | "relocate">("product");
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [locationCode, setLocationCode] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode, variant]);

  async function lookup(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    setError("");
    setToast("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/variants/by-barcode?barcode=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "לא נמצא");
      setVariant(data);
      setBarcode("");
      if (mode === "relocate") {
        setToast("סרוק עכשיו את קוד המדף החדש");
      }
    } catch (e) {
      setVariant(null);
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function quickDelta(delta: 1 | -1) {
    if (!variant) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          mode: "quick",
          delta,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setVariant({ ...variant, quantityOnHand: data.variant.quantityOnHand });
      setToast(delta === 1 ? "נוסף 1" : "הופחת 1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function relocate(code: string) {
    if (!variant) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          locationCode: code.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setToast(`הועבר ל-${code.trim()}`);
      setLocationCode("");
      // refresh variant
      const refreshed = await fetch(
        `/api/variants/by-barcode?barcode=${encodeURIComponent(variant.barcode)}`
      );
      if (refreshed.ok) setVariant(await refreshed.json());
      setMode("product");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  function onScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "relocate" && variant && locationCode) {
      relocate(locationCode);
      return;
    }
    if (mode === "relocate" && variant && barcode) {
      // treat barcode field as location code when relocating after product selected
      relocate(barcode);
      setBarcode("");
      return;
    }
    lookup(barcode);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("product")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${
            mode === "product" ? "bg-teal-700 text-white" : "bg-white border border-slate-300"
          }`}
        >
          סריקת מוצר
        </button>
        <button
          type="button"
          onClick={() => setMode("relocate")}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${
            mode === "relocate" ? "bg-teal-700 text-white" : "bg-white border border-slate-300"
          }`}
        >
          העברת מדף
        </button>
      </div>

      <Card>
        <form onSubmit={onScanSubmit} className="space-y-3">
          <Label>
            {mode === "relocate" && variant
              ? "סרוק קוד מיקום יעד"
              : "סרוק ברקוד מוצר"}
          </Label>
          <Input
            ref={inputRef}
            value={mode === "relocate" && variant ? locationCode : barcode}
            onChange={(e) =>
              mode === "relocate" && variant
                ? setLocationCode(e.target.value)
                : setBarcode(e.target.value)
            }
            placeholder={
              mode === "relocate" && variant ? "למשל A-01-03-12" : "הקלד או סרוק ברקוד"
            }
            className="text-center text-lg font-mono tracking-wide"
            autoComplete="off"
            inputMode="none"
          />
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "טוען..." : "אשר"}
          </Button>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      {variant && (
        <Card className="space-y-4">
          <div>
            <div className="text-xs text-slate-500">{variant.sku}</div>
            <h2 className="text-xl font-bold text-slate-900">{variant.product.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {attributesLabel(variant.attributes)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-xs text-slate-500">מלאי נוכחי</div>
              <div
                className={`text-3xl font-bold ${
                  variant.quantityOnHand <= variant.minAlertLevel
                    ? "text-rose-600"
                    : "text-teal-800"
                }`}
              >
                {variant.quantityOnHand}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-xs text-slate-500">מיקום</div>
              <div className="mt-1 flex items-center justify-center gap-1 font-mono text-lg font-semibold">
                <MapPin className="h-4 w-4 text-slate-400" />
                {variant.location?.code ?? "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="secondary"
              disabled={busy}
              onClick={() => quickDelta(-1)}
              className="h-16 text-lg"
            >
              <Minus className="h-5 w-5" />
              −1
            </Button>
            <Button
              size="lg"
              disabled={busy}
              onClick={() => quickDelta(1)}
              className="h-16 text-lg"
            >
              <Plus className="h-5 w-5" />
              +1
            </Button>
          </div>

          <p className="text-center text-xs text-slate-400">
            ברקוד: {variant.barcode} · שמור: {variant.quantityReserved}
          </p>
        </Card>
      )}
    </div>
  );
}
