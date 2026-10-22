"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";

type Variant = {
  id: string;
  sku: string;
  quantityOnHand: number;
  product: { title: string };
};

export function BulkAndImport({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"set" | "delta">("set");
  const [rows, setRows] = useState(
    variants.slice(0, 8).map((v) => ({
      variantId: v.id,
      quantity: String(v.quantityOnHand),
    }))
  );
  const [csv, setCsv] = useState(
    "title,baseSku,categoryName,barcode,sku,costPrice,sellingPrice,qty,unitOfMeasure\n"
  );
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runBulk() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/bulk/quantities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          items: rows.map((r) => ({
            variantId: r.variantId,
            quantity: Number(r.quantity),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      const ok = data.results.filter((r: { ok: boolean }) => r.ok).length;
      setMsg(`עודכנו ${ok}/${data.results.length} פריטים`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/import/products", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csv,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setMsg(`יובאו ${data.created} מוצרים` + (data.errors?.length ? ` · ${data.errors.length} שגיאות` : ""));
      if (data.errors?.length) setError(data.errors.slice(0, 5).join(" | "));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">עדכון כמויות (Bulk)</h2>
        <Select value={mode} onChange={(e) => setMode(e.target.value as "set" | "delta")}>
          <option value="set">קבע כמות מוחלטת</option>
          <option value="delta">שינוי יחסי (+/-)</option>
        </Select>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px] gap-2">
            <Select
              value={row.variantId}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, variantId: e.target.value };
                setRows(next);
              }}
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} — {v.product.title} ({v.quantityOnHand})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              value={row.quantity}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...row, quantity: e.target.value };
                setRows(next);
              }}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setRows([
                ...rows,
                { variantId: variants[0]?.id || "", quantity: "0" },
              ])
            }
          >
            הוסף שורה
          </Button>
          <Button onClick={runBulk} disabled={busy || !variants.length}>
            עדכן
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">ייבוא מוצרים CSV</h2>
        <p className="text-xs text-[var(--muted)]">
          כותרות: title,baseSku,categoryName,barcode,sku,costPrice,sellingPrice,qty,unitOfMeasure
          (UNIT/CARTON/SQM)
        </p>
        <Label>הדבק CSV או העלה תוכן</Label>
        <textarea
          className="h-48 w-full rounded-lg border border-[var(--border)] p-3 font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setCsv(await f.text());
          }}
        />
        <Button onClick={runImport} disabled={busy}>
          ייבא
        </Button>
      </Card>

      {(msg || error) && (
        <div className="lg:col-span-2 space-y-2">
          {msg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {msg}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
