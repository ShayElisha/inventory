"use client";

import { useState } from "react";
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
import { PackageMinus, Plus, Play, Trash2 } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  quantityOnHand: number;
  product: { title: string };
};

type Template = {
  id: string;
  name: string;
  notes: string | null;
  reasonCode: string;
  items: { variantId: string; quantity: number }[];
  _count: { items: number };
};

export function OutboundTemplatesPanel({
  templates,
  variants,
}: {
  templates: Template[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [reasonCode, setReasonCode] = useState("SALE");
  const [rows, setRows] = useState<{ variantId: string; quantity: number }[]>([
    { variantId: variants[0]?.id || "", quantity: 1 },
  ]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState<{
    name: string;
    okCount: number;
    failCount: number;
    results: { sku: string; title: string; quantity: number; ok: boolean; error?: string }[];
  } | null>(null);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setToast("");
    try {
      const res = await fetch("/api/outbound-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          notes,
          reasonCode,
          items: rows.filter((r) => r.variantId && r.quantity > 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShowCreate(false);
      setName("");
      setNotes("");
      setRows([{ variantId: variants[0]?.id || "", quantity: 1 }]);
      setToast("התבנית נשמרה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function runTemplate(id: string, templateName: string) {
    if (
      !confirm(
        `להריץ את תבנית הניפוק "${templateName}"?\nכל הפריטים בתבנית ינופקו מהמלאי עכשיו.`
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    setToast("");
    setRunResult(null);
    try {
      const res = await fetch(`/api/outbound-templates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setRunResult(data);
      setToast(
        `הושלם: ${data.okCount} הצליחו` +
          (data.failCount ? ` · ${data.failCount} נכשלו` : "")
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function removeTemplate(id: string, templateName: string) {
    if (!confirm(`למחוק את תבנית הניפוק "${templateName}"?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/outbound-templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const reasonLabel = (code: string) =>
    OUTBOUND_REASONS.find((r) => r.code === code)?.label || code;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <PackageMinus className="h-5 w-5 text-[var(--danger)]" />
            תבניות ניפוק חוזרות
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            שמרו סט פריטים וכמויות קבוע — והריצו ניפוק בלחיצה (לא ליקוט).
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {showCreate ? "סגור" : "תבנית חדשה"}
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {toast && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-[var(--ok-soft)] dark:text-[var(--ok)]">
          {toast}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={createTemplate}
          className="mb-5 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>שם תבנית</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="למשל: ניפוק בוקר קבוע"
              />
            </div>
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
              <Label>הערות</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
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
                min={1}
                value={row.quantity}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, quantity: Number(e.target.value) || 1 };
                  setRows(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                הסר
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setRows([
                  ...rows,
                  { variantId: variants[0]?.id || "", quantity: 1 },
                ])
              }
            >
              הוסף שורה
            </Button>
            <Button type="submit" disabled={loading || !variants.length}>
              שמור תבנית
            </Button>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">אין תבניות ניפוק עדיין</p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium">{t.name}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">
                  {t._count.items} פריטים · {reasonLabel(t.reasonCode)}
                  {t.notes ? ` · ${t.notes}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={loading}
                  onClick={() => runTemplate(t.id, t.name)}
                >
                  <Play className="h-3.5 w-3.5" />
                  הרץ ניפוק
                </Button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  disabled={loading}
                  onClick={() => removeTemplate(t.id, t.name)}
                  title="מחק"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {runResult && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="mb-2 text-sm font-medium">
            תוצאות: {runResult.name}{" "}
            <Badge tone={runResult.failCount ? "warn" : "ok"}>
              {runResult.okCount} הצליחו
              {runResult.failCount ? ` · ${runResult.failCount} נכשלו` : ""}
            </Badge>
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {runResult.results.map((r, i) => (
              <li
                key={`${r.sku}-${i}`}
                className={r.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}
              >
                {r.ok ? "✓" : "✗"} {r.sku} — {r.title} ×{r.quantity}
                {r.error ? ` (${r.error})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
