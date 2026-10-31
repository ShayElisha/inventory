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
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";

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
  items: { variantId: string; quantity: number }[];
  _count: { items: number };
};

export function PickTemplatesPanel({
  templates,
  variants,
}: {
  templates: Template[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<{ variantId: string; quantity: number }[]>([
    { variantId: variants[0]?.id || "", quantity: 1 },
  ]);
  const [prefix, setPrefix] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCount = selected.length;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selected.length === templates.length) setSelected([]);
    else setSelected(templates.map((t) => t.id));
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pick-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          notes,
          items: rows.filter((r) => r.variantId && r.quantity > 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShowCreate(false);
      setName("");
      setNotes("");
      setRows([{ variantId: variants[0]?.id || "", quantity: 1 }]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function startFromTemplates() {
    if (!selected.length) {
      setError("בחרו לפחות תבנית אחת");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/picks/from-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateIds: selected,
          referencePrefix: prefix || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSelected([]);
      router.refresh();
      if (data.lists?.length === 1) {
        router.push(`/picks/${data.lists[0].id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function removeTemplate(id: string, templateName: string) {
    if (!confirm(`למחוק את התבנית "${templateName}"?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/pick-templates/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSelected((prev) => prev.filter((x) => x !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const variantLabel = useMemo(() => {
    const map = new Map(variants.map((v) => [v.id, v]));
    return (id: string) => {
      const v = map.get(id);
      return v ? `${v.sku} — ${v.product.title}` : id;
    };
  }, [variants]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 flex-1 text-right"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Layers className="h-5 w-5 shrink-0 text-[var(--accent)]" />
              תבניות ליקוט קבועות
              <span className="text-sm font-normal text-[var(--muted)]">
                ({templates.length})
              </span>
              {collapsed ? (
                <ChevronDown className="ms-auto h-5 w-5 shrink-0 text-[var(--muted)]" />
              ) : (
                <ChevronUp className="ms-auto h-5 w-5 shrink-0 text-[var(--muted)]" />
              )}
            </h2>
            {!collapsed && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                בחרו כמה תבניות והפעילו ליקוט במקביל — כל תבנית הופכת לרשימה
                נפרדת. תוך כדי ליקוט אפשר להוסיף או להסיר פריטים ספציפיים.
              </p>
            )}
          </button>
          {!collapsed && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              {showCreate ? "סגור" : "תבנית חדשה"}
            </Button>
          )}
        </div>

        {!collapsed && (
          <div className="mt-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {showCreate && (
          <form
            onSubmit={createTemplate}
            className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>שם תבנית</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="למשל: ערכת סניף צפון"
                />
              </div>
              <div>
                <Label>הערות (אופציונלי)</Label>
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
          <p className="text-sm text-[var(--muted)]">
            אין תבניות עדיין — צרו תבנית קבועה ואז הפעילו ליקוט ממנה.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={toggleAll}>
                <CheckSquare className="h-4 w-4" />
                {selected.length === templates.length ? "בטל בחירה" : "בחר הכל"}
              </Button>
              <Badge tone={selectedCount ? "ok" : "neutral"}>
                {selectedCount} נבחרו
              </Badge>
            </div>

            <ul className="space-y-2">
              {templates.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <li
                    key={t.id}
                    className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-3 py-3 ${
                      on
                        ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]/50"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={on}
                        onChange={() => toggle(t.id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{t.name}</span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {t._count.items} פריטים
                          {t.notes ? ` · ${t.notes}` : ""}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {t.items
                            .slice(0, 4)
                            .map(
                              (it) =>
                                `${variantLabel(it.variantId)} ×${it.quantity}`
                            )
                            .join(" · ")}
                          {t.items.length > 4 ? "…" : ""}
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      title="מחק תבנית"
                      disabled={loading}
                      onClick={() => removeTemplate(t.id, t.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-4">
              <div className="min-w-[180px] flex-1">
                <Label>קידומת אסמכתא (אופציונלי)</Label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="למשל: משלוח-בוקר"
                />
              </div>
              <Button
                type="button"
                disabled={loading || selectedCount === 0}
                onClick={startFromTemplates}
              >
                {loading
                  ? "יוצר..."
                  : `התחל ליקוט (${selectedCount}) במקביל`}
              </Button>
            </div>
          </>
        )}
          </div>
        )}
      </Card>
    </div>
  );
}
