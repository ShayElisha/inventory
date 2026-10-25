"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { RefreshCw } from "lucide-react";

type Variant = { id: string; sku: string; quantityOnHand: number; product: { title: string } };
type Supplier = { id: string; name: string };
type Rule = {
  id: string;
  minQty: number;
  maxQty: number | null;
  reorderQty: number;
  active: boolean;
  variant: Variant;
  supplier: Supplier | null;
};
type Suggestion = {
  ruleId: string;
  variantId: string;
  sku: string;
  title: string;
  onHand: number;
  minQty: number;
  suggestQty: number;
  supplierId: string | null;
  supplierName: string | null;
};

export function ReorderPanel({
  rules,
  suggestions,
  variants,
  suppliers,
}: {
  rules: Rule[];
  suggestions: Suggestion[];
  variants: Variant[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id || "");
  const [minQty, setMinQty] = useState(5);
  const [reorderQty, setReorderQty] = useState(10);
  const [maxQty, setMaxQty] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(suggestions.map((s) => [s.variantId, true]))
  );

  async function saveRule(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          minQty,
          reorderQty,
          maxQty: maxQty ? Number(maxQty) : null,
          supplierId: supplierId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function createPo() {
    const items = suggestions
      .filter((s) => selected[s.variantId])
      .map((s) => ({ variantId: s.variantId, quantity: s.suggestQty }));
    if (!items.length) return;
    setLoading(true);
    setError("");
    try {
      const supplier =
        suggestions.find((s) => selected[s.variantId] && s.supplierId)?.supplierId ||
        null;
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-po", items, supplierId: supplier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
      router.push("/purchases");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {suggestions.length > 0 && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">הצעות הזמנה ({suggestions.length})</h2>
            <Button type="button" disabled={loading} onClick={createPo}>
              <RefreshCw className="h-4 w-4" />
              צור PO מההצעות
            </Button>
          </div>
          <ul className="space-y-2 text-sm">
            {suggestions.map((s) => (
              <li key={s.variantId} className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[s.variantId])}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [s.variantId]: e.target.checked }))
                    }
                  />
                  <span>
                    {s.title}{" "}
                    <span className="font-mono text-xs text-[var(--muted)]">{s.sku}</span>
                  </span>
                </label>
                <span className="text-[var(--muted)]">
                  מלאי {s.onHand} ≤ {s.minQty} · הזמן {s.suggestQty}
                  {s.supplierName ? ` · ${s.supplierName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <form onSubmit={saveRule} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>וריאנט</Label>
            <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} — {v.product.title} ({v.quantityOnHand})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>מינימום</Label>
            <Input type="number" value={minQty} onChange={(e) => setMinQty(Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label>כמות הזמנה</Label>
            <Input type="number" value={reorderQty} onChange={(e) => setReorderQty(Number(e.target.value) || 1)} />
          </div>
          <div>
            <Label>מקסימום (אופציונלי)</Label>
            <Input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
          </div>
          <div>
            <Label>ספק</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading || !variantId}>שמור כלל</Button>
          </div>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--surface-2)] text-right text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">מוצר</th>
              <th className="px-3 py-2 font-medium">מלאי</th>
              <th className="px-3 py-2 font-medium">מינ׳</th>
              <th className="px-3 py-2 font-medium">הזמנה</th>
              <th className="px-3 py-2 font-medium">ספק</th>
              <th className="px-3 py-2 font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  {r.variant.product.title}{" "}
                  <span className="font-mono text-xs text-[var(--muted)]">{r.variant.sku}</span>
                </td>
                <td className="px-3 py-2">{r.variant.quantityOnHand}</td>
                <td className="px-3 py-2">{r.minQty}</td>
                <td className="px-3 py-2">{r.reorderQty}</td>
                <td className="px-3 py-2">{r.supplier?.name || "—"}</td>
                <td className="px-3 py-2">
                  <Badge tone={r.active ? "ok" : "neutral"}>
                    {r.active ? "פעיל" : "כבוי"}
                  </Badge>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--muted)]">
                  אין כללי הזמנה
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
