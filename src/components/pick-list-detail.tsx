"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type VariantOpt = {
  id: string;
  sku: string;
  quantityOnHand: number;
  product: { title: string };
};

type LotOpt = {
  id: string;
  variantId: string;
  lotCode: string;
  quantity: number;
  expiryDate: string | null;
};

type SerialOpt = {
  id: string;
  variantId: string;
  serial: string;
};

type List = {
  id: string;
  status: string;
  salesOrder?: { id: string; number: string; customerName: string } | null;
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
      product: { title: string; trackLots?: boolean; trackSerials?: boolean };
      location: { code: string } | null;
    };
  }[];
};

export function PickListDetail({
  list,
  variants = [],
  lots = [],
  serials = [],
}: {
  list: List;
  variants?: VariantOpt[];
  lots?: LotOpt[];
  serials?: SerialOpt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [addVariantId, setAddVariantId] = useState(variants[0]?.id || "");
  const [addQty, setAddQty] = useState(1);
  const [lotByItem, setLotByItem] = useState<Record<string, string>>({});
  const [serialTextByItem, setSerialTextByItem] = useState<Record<string, string>>(
    {}
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const editable = list.status !== "DONE" && list.status !== "CANCELLED";
  const existingVariantIds = new Set(list.items.map((i) => i.variant.id));

  const lotsByVariant = useMemo(() => {
    const map = new Map<string, LotOpt[]>();
    for (const lot of lots) {
      const arr = map.get(lot.variantId) || [];
      arr.push(lot);
      map.set(lot.variantId, arr);
    }
    return map;
  }, [lots]);

  const serialsByVariant = useMemo(() => {
    const map = new Map<string, SerialOpt[]>();
    for (const sn of serials) {
      const arr = map.get(sn.variantId) || [];
      arr.push(sn);
      map.set(sn.variantId, arr);
    }
    return map;
  }, [serials]);

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
      setExpandedId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  }

  async function pickItem(itemId: string) {
    const item = list.items.find((i) => i.id === itemId);
    if (!item) return;
    const rem = item.quantity - item.pickedQty;
    const trackLots = Boolean(item.variant.product.trackLots);
    const trackSerials = Boolean(item.variant.product.trackSerials);
    const needsExpand = trackLots || trackSerials;

    if (needsExpand && expandedId !== itemId) {
      setExpandedId(itemId);
      return;
    }

    const payload: Record<string, unknown> = {
      action: "pick_item",
      itemId,
      quantity: rem,
    };

    if (trackLots) {
      const lotId = lotByItem[itemId];
      if (!lotId) {
        setError("בחרו אצווה לפני ליקוט");
        setExpandedId(itemId);
        return;
      }
      payload.lotId = lotId;
    }

    if (trackSerials) {
      const raw = serialTextByItem[itemId] || "";
      const serialsList = raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (serialsList.length !== rem) {
        setError(`הזינו ${rem} מספרים סידוריים (מופרדים בפסיק או שורה)`);
        setExpandedId(itemId);
        return;
      }
      payload.serials = serialsList;
    }

    await api(payload, itemId);
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
      {list.salesOrder && (
        <p className="text-sm text-[var(--muted)]">
          מקושר להזמנה{" "}
          <a
            href={`/orders`}
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {list.salesOrder.number}
          </a>{" "}
          · {list.salesOrder.customerName}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {list.items.map((it) => {
        const rem = it.quantity - it.pickedQty;
        const trackLots = Boolean(it.variant.product.trackLots);
        const trackSerials = Boolean(it.variant.product.trackSerials);
        const open = expandedId === it.id;
        const variantLots = lotsByVariant.get(it.variant.id) || [];
        const variantSerials = serialsByVariant.get(it.variant.id) || [];

        return (
          <Card key={it.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{it.variant.product.title}</div>
                <div className="text-xs text-[var(--muted)]">
                  {it.variant.sku} · {attributesLabel(it.variant.attributes)} · מדף{" "}
                  {it.variant.location?.code ?? "—"} · במלאי{" "}
                  {it.variant.quantityOnHand}
                  {trackLots ? " · אצווה" : ""}
                  {trackSerials ? " · סריאל" : ""}
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
                    {busy === it.id
                      ? "..."
                      : trackLots || trackSerials
                        ? open
                          ? "אשר ליקוט"
                          : "לקט…"
                        : "לקט"}
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
            </div>

            {open && it.status !== "DONE" && editable && (
              <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                {trackLots && (
                  <div>
                    <Label>אצווה</Label>
                    <Select
                      value={lotByItem[it.id] || ""}
                      onChange={(e) =>
                        setLotByItem({ ...lotByItem, [it.id]: e.target.value })
                      }
                    >
                      <option value="">בחרו אצווה</option>
                      {variantLots.map((lot) => (
                        <option key={lot.id} value={lot.id}>
                          {lot.lotCode} · יתרה {lot.quantity}
                          {lot.expiryDate
                            ? ` · תוקף ${new Date(lot.expiryDate).toLocaleDateString("he-IL")}`
                            : ""}
                        </option>
                      ))}
                    </Select>
                    {variantLots.length === 0 && (
                      <p className="mt-1 text-xs text-[var(--danger)]">
                        אין אצוות עם מלאי לפריט זה
                      </p>
                    )}
                  </div>
                )}
                {trackSerials && (
                  <div>
                    <Label>מספרים סידוריים ({rem})</Label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      rows={Math.min(4, Math.max(2, rem))}
                      placeholder="סריאל1, סריאל2…"
                      value={serialTextByItem[it.id] || ""}
                      onChange={(e) =>
                        setSerialTextByItem({
                          ...serialTextByItem,
                          [it.id]: e.target.value,
                        })
                      }
                    />
                    {variantSerials.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        זמינים:{" "}
                        {variantSerials
                          .slice(0, 8)
                          .map((s) => s.serial)
                          .join(", ")}
                        {variantSerials.length > 8 ? "…" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

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
