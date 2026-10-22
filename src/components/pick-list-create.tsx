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

export function PickListCreate({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<{ variantId: string; quantity: number }[]>([
    { variantId: variants[0]?.id || "", quantity: 1 },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          notes,
          items: rows.filter((r) => r.variantId && r.quantity > 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.push(`/picks/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">רשימת ליקוט חדשה</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>מספר הזמנה / אסמכתא</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
              placeholder="PO-1001"
            />
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setRows([...rows, { variantId: variants[0]?.id || "", quantity: 1 }])
            }
          >
            הוסף שורה
          </Button>
          <Button type="submit" disabled={loading || !variants.length}>
            צור רשימה
          </Button>
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </form>
    </Card>
  );
}
