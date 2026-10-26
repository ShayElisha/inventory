"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { PackageMinus, Plus, Trash2, Search } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  barcode: string;
  quantityOnHand: number;
  quantityReserved?: number;
  product: { title: string };
};

type Line = {
  key: string;
  variantId: string;
  quantity: number;
};

function newLine(variants: Variant[]): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variantId: variants[0]?.id || "",
    quantity: 1,
  };
}

export function BulkOutboundPanel({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([newLine(variants)]);
  const [reasonCode, setReasonCode] = useState("SALE");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState<{
    okCount: number;
    failCount: number;
    results: {
      sku: string;
      title: string;
      quantity: number;
      ok: boolean;
      error?: string;
      newQuantity?: number;
    }[];
  } | null>(null);

  const filteredVariants = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter(
      (v) =>
        v.sku.toLowerCase().includes(q) ||
        v.barcode.toLowerCase().includes(q) ||
        v.product.title.toLowerCase().includes(q)
    );
  }, [variants, filter]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }

  function available(v: Variant | undefined) {
    if (!v) return 0;
    return v.quantityOnHand - (v.quantityReserved || 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = lines.filter((l) => l.variantId && l.quantity > 0);
    if (!payload.length) {
      setError("הוסיפו לפחות שורה אחת");
      return;
    }

    for (const line of payload) {
      const v = variants.find((x) => x.id === line.variantId);
      if (v && line.quantity > available(v)) {
        setError(
          `אין מספיק מלאי ל־${v.sku} (מבוקש ${line.quantity}, פנוי ${available(v)})`
        );
        return;
      }
    }

    setLoading(true);
    setError("");
    setToast("");
    setRunResult(null);
    try {
      const res = await fetch("/api/stock/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasonCode,
          notes,
          preferFefo: true,
          lines: payload.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");

      setRunResult(data);
      setToast(
        `נופקו ${data.okCount} שורות` +
          (data.failCount ? ` · ${data.failCount} נכשלו` : "")
      );
      if (data.failCount === 0) {
        setLines([newLine(variants)]);
        setNotes("");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const totalQty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2">
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
          <Label>הערות / אסמכתא</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="לקוח, הזמנה, משלוח…"
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-[var(--ok-soft)] dark:text-[var(--ok)]">
          {toast}
        </div>
      )}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">שורות ניפוק</h2>
            <p className="text-sm text-[var(--muted)]">
              בנו רשימה ואשרו בלחיצה אחת — כל השורות ינופקו יחד (FEFO אוטומטי)
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label>סינון</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="שם / מק״ט / ברקוד"
                  className="w-48 pe-8"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLines((prev) => [...prev, newLine(variants)])}
            >
              <Plus className="h-4 w-4" />
              שורה
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => {
            const v = variants.find((x) => x.id === line.variantId);
            const avail = available(v);
            const over = v && line.quantity > avail;
            return (
              <div
                key={line.key}
                className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 lg:grid-cols-[1.6fr_100px_120px_40px]"
              >
                <div>
                  <div className="mb-1 text-xs text-[var(--muted)]">
                    שורה {idx + 1}
                  </div>
                  <Select
                    value={line.variantId}
                    onChange={(e) =>
                      updateLine(line.key, { variantId: e.target.value })
                    }
                    required
                  >
                    {(filter ? filteredVariants : variants).map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.sku} — {opt.product.title} (פנוי{" "}
                        {available(opt)})
                      </option>
                    ))}
                    {filter &&
                      v &&
                      !filteredVariants.some((x) => x.id === v.id) && (
                        <option value={v.id}>
                          {v.sku} — {v.product.title}
                        </option>
                      )}
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-[var(--muted)]">כמות</div>
                  <Input
                    type="number"
                    min={1}
                    max={avail || undefined}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    required
                  />
                </div>
                <div className="flex flex-col justify-end pb-2 text-xs text-[var(--muted)]">
                  {v ? (
                    <span className={over ? "text-[var(--danger)]" : ""}>
                      פנוי {avail}
                      {over ? " · חסר!" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="flex items-end justify-center pb-1">
                  <button
                    type="button"
                    className="rounded p-2 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    onClick={() =>
                      setLines((prev) =>
                        prev.length === 1
                          ? prev
                          : prev.filter((l) => l.key !== line.key)
                      )
                    }
                    title="הסר שורה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-sm text-[var(--muted)]">
            {lines.length} שורות · סה״כ {totalQty} יח׳
          </p>
          <Button
            type="submit"
            size="lg"
            variant="danger"
            disabled={loading || !variants.length}
          >
            <PackageMinus className="h-5 w-5" />
            {loading ? "מנפק..." : "אשר ניפוק מרוכז"}
          </Button>
        </div>
      </Card>

      {runResult && (
        <Card className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge tone="ok">{runResult.okCount} הצליחו</Badge>
            {runResult.failCount > 0 && (
              <Badge tone="danger">{runResult.failCount} נכשלו</Badge>
            )}
          </div>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {runResult.results.map((r, i) => (
              <li
                key={`${r.sku}-${i}`}
                className="flex justify-between gap-2 border-t border-[var(--border)] py-1"
              >
                <span>
                  {r.sku} — {r.title} ×{r.quantity}
                </span>
                <span
                  className={
                    r.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"
                  }
                >
                  {r.ok ? `נותר ${r.newQuantity}` : r.error}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </form>
  );
}
