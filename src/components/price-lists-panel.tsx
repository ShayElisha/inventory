"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { Tags } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  product: { title: string; sellingPrice: number };
};

type PriceList = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  _count: { items: number; customers: number };
};

export function PriceListsPanel({
  priceLists,
  variants,
}: {
  priceLists: PriceList[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [rows, setRows] = useState([
    {
      variantId: variants[0]?.id || "",
      unitPrice: variants[0]?.product.sellingPrice || 0,
      minQty: 1,
    },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency,
          items: rows.filter((r) => r.variantId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShow(false);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(p: PriceList) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/price-lists/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          מחירונים ללקוחות · מחיר לפי מק״ט וכמות מינימום
        </p>
        <Button type="button" onClick={() => setShow((v) => !v)}>
          <Tags className="h-4 w-4" />
          מחירון חדש
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {show && (
        <Card>
          <form onSubmit={createList} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>שם מחירון</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>מטבע</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>פריטים</Label>
              {rows.map((row, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-3">
                  <Select
                    value={row.variantId}
                    onChange={(e) => {
                      const next = [...rows];
                      const v = variants.find((x) => x.id === e.target.value);
                      next[idx] = {
                        ...row,
                        variantId: e.target.value,
                        unitPrice: v?.product.sellingPrice || 0,
                      };
                      setRows(next);
                    }}
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.sku} — {v.product.title}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...row,
                        unitPrice: Number(e.target.value) || 0,
                      };
                      setRows(next);
                    }}
                    placeholder="מחיר"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={row.minQty}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...row,
                        minQty: Math.max(1, Number(e.target.value) || 1),
                      };
                      setRows(next);
                    }}
                    placeholder="כמות מינ׳"
                  />
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setRows([
                    ...rows,
                    {
                      variantId: variants[0]?.id || "",
                      unitPrice: variants[0]?.product.sellingPrice || 0,
                      minQty: 1,
                    },
                  ])
                }
              >
                הוסף שורה
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !variants.length}>
                שמור
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShow(false)}
              >
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-[var(--surface-2)] text-right text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">שם</th>
              <th className="px-3 py-2 font-medium">מטבע</th>
              <th className="px-3 py-2 font-medium">פריטים</th>
              <th className="px-3 py-2 font-medium">לקוחות</th>
              <th className="px-3 py-2 font-medium">סטטוס</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {priceLists.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.currency}</td>
                <td className="px-3 py-2">{p._count.items}</td>
                <td className="px-3 py-2">{p._count.customers}</td>
                <td className="px-3 py-2">
                  <Badge tone={p.active ? "ok" : "neutral"}>
                    {p.active ? "פעיל" : "מושבת"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => toggleActive(p)}
                  >
                    {p.active ? "השבת" : "הפעל"}
                  </Button>
                </td>
              </tr>
            ))}
            {priceLists.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-[var(--muted)]"
                >
                  אין מחירונים עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
