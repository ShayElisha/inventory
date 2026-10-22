"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type VariantOpt = {
  id: string;
  sku: string;
  quantityOnHand: number;
  product: { title: string };
};

type List = {
  id: string;
  status: string;
  items: {
    id: string;
    quantity: number;
    pickedQty: number;
    status: string;
    variant: {
      id: string;
      sku: string;
      quantityOnHand: number;
      attributes: string;
      product: { title: string };
      location: { code: string } | null;
    };
  }[];
};

export function PickListDetail({
  list,
  variants = [],
}: {
  list: List;
  variants?: VariantOpt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [addVariantId, setAddVariantId] = useState(variants[0]?.id || "");
  const [addQty, setAddQty] = useState(1);

  const editable = list.status !== "DONE" && list.status !== "CANCELLED";
  const existingVariantIds = new Set(list.items.map((i) => i.variant.id));

  async function api(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
    setError("");
    try {
      const res = await fetch(`/api/picks/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  }

  async function pickItem(itemId: string) {
    await api({ action: "pick_item", itemId }, itemId);
  }

  async function removeItem(itemId: string) {
    if (!confirm("להסיר את הפריט מרשימת הליקוט?")) return;
    await api({ action: "remove_item", itemId }, `rm-${itemId}`);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!addVariantId) return;
    await api(
      { action: "add_item", variantId: addVariantId, quantity: addQty },
      "add"
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {list.items.map((it) => (
        <Card
          key={it.id}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <div className="font-semibold">{it.variant.product.title}</div>
            <div className="text-xs text-[var(--muted)]">
              {it.variant.sku} · {attributesLabel(it.variant.attributes)} · מדף{" "}
              {it.variant.location?.code ?? "—"} · במלאי{" "}
              {it.variant.quantityOnHand}
            </div>
            <div className="mt-1 text-sm">
              נדרש {it.quantity} · נלקט {it.pickedQty}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={it.status === "DONE" ? "ok" : "warn"}>
              {it.status === "DONE" ? "הושלם" : "ממתין"}
            </Badge>
            {it.status !== "DONE" && editable && (
              <Button
                size="sm"
                disabled={busy === it.id}
                onClick={() => pickItem(it.id)}
              >
                {busy === it.id ? "..." : "לקט"}
              </Button>
            )}
            {editable && it.pickedQty === 0 && (
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                title="הסר מהרשימה"
                disabled={busy === `rm-${it.id}`}
                onClick={() => removeItem(it.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </Card>
      ))}

      {list.items.length === 0 && (
        <Card>
          <p className="text-sm text-[var(--muted)]">אין פריטים ברשימה</p>
        </Card>
      )}

      {editable && variants.length > 0 && (
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
            <Plus className="h-4 w-4 text-[var(--accent)]" />
            הוסף פריט ספציפי לליקוט
          </h3>
          <form
            onSubmit={addItem}
            className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end"
          >
            <div>
              <Label>פריט</Label>
              <Select
                value={addVariantId}
                onChange={(e) => setAddVariantId(e.target.value)}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} — {v.product.title} ({v.quantityOnHand})
                    {existingVariantIds.has(v.id) ? " · כבר ברשימה" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>כמות</Label>
              <Input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(Number(e.target.value) || 1)}
              />
            </div>
            <Button type="submit" disabled={busy === "add"}>
              {busy === "add" ? "מוסיף..." : "הוסף"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-[var(--muted)]">
            אם הפריט כבר ברשימה ולא הושלם — הכמות תתווסף לנדרש. פריט שכבר נלקט
            חלקית לא ניתן להסרה.
          </p>
        </Card>
      )}
    </div>
  );
}
