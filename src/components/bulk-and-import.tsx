"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  quantityOnHand: number;
  product: { title: string };
};

export function BulkAndImport({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"set" | "delta">("set");
  const [rows, setRows] = useState(
    variants.slice(0, 8).map((v) => ({
      variantId: v.id,
      quantity: String(v.quantityOnHand),
    }))
  );
  const [csv, setCsv] = useState(
    "שם,מקט,קטגוריה,ברקוד,SKU,עלות,מכירה,כמות,יחידה,ספק,מיקום,מינימום התראה\n"
  );
  const [fileName, setFileName] = useState("");
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

  async function runCsvImport() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/import/products", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: csv,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setMsg(formatImportMsg(data));
      if (data.errors?.length) setError(data.errors.slice(0, 8).join(" | "));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function runExcelImport(file: File) {
    setBusy(true);
    setError("");
    setMsg("");
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/products", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setMsg(formatImportMsg(data));
      if (data.errors?.length) setError(data.errors.slice(0, 8).join(" | "));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function formatImportMsg(data: {
    created?: number;
    categoriesCreated?: number;
    errors?: string[];
  }) {
    const parts = [`יובאו ${data.created ?? 0} מוצרים`];
    if (data.categoriesCreated) {
      parts.push(`נוצרו ${data.categoriesCreated} קטגוריות`);
    }
    if (data.errors?.length) {
      parts.push(`${data.errors.length} שגיאות`);
    }
    return parts.join(" · ");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">עדכון כמויות (Bulk)</h2>
        <Select
          value={mode}
          onChange={(e) => setMode(e.target.value as "set" | "delta")}
        >
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

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">ייבוא מוצרים מאקסל</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            העלו טבלת Excel עם קטגוריות — קטגוריה חסרה תיווצר אוטומטית. אפשר גם
            CSV.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href="/api/import/products/template" download>
            <Button type="button" variant="secondary">
              <Download className="h-4 w-4" />
              הורדת תבנית Excel
            </Button>
          </a>
        </div>

        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4">
          <Label>העלאת קובץ (.xlsx / .csv)</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="mt-2 block w-full text-sm"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runExcelImport(f);
            }}
          />
          {fileName && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {fileName}
            </p>
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">
            עמודות בסיס: שם, מקט, קטגוריה… · עמודות נוספות (מידה/צבע/שדות
            מותאמים) נקלטות אוטומטית לפי שם הכותרת
          </p>
        </div>

        <details className="rounded-lg border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-sm font-medium">
            או הדביקו CSV ידנית
          </summary>
          <div className="mt-3 space-y-2">
            <textarea
              className="h-40 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={runCsvImport}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              ייבא CSV
            </Button>
          </div>
        </details>
      </Card>

      {(msg || error) && (
        <div className="space-y-2 lg:col-span-2">
          {msg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
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
