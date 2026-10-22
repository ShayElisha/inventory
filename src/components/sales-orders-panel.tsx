"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { SO_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { ShoppingCart, Play, FileText, Truck } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  quantityOnHand: number;
  product: { title: string; sellingPrice: number };
};

type SO = {
  id: string;
  number: string;
  customerName: string;
  status: string;
  priority: number;
  slaDueAt: string | null;
  vatRate: number;
  shippingCarrier: string | null;
  shippingRef: string | null;
  lines: {
    id: string;
    qtyOrdered: number;
    qtyFulfilled: number;
    unitPrice: number;
    variant: { sku: string; quantityOnHand: number; product: { title: string } };
  }[];
};

export function SalesOrdersPanel({
  orders,
  variants,
}: {
  orders: SO[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [priority, setPriority] = useState("3");
  const [slaDueAt, setSlaDueAt] = useState("");
  const [vatRate, setVatRate] = useState("17");
  const [tiers, setTiers] = useState("10:5,50:10"); // minQty:percent
  const [rows, setRows] = useState([
    { variantId: variants[0]?.id || "", quantity: 1, unitPrice: variants[0]?.product.sellingPrice || 0 },
  ]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fulfillQty, setFulfillQty] = useState<Record<string, number>>({});
  const [sim, setSim] = useState<{
    ok: boolean;
    results: { sku: string; title: string; requested: number; available: number; ok: boolean }[];
  } | null>(null);

  function parseTiers() {
    return tiers
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [minQty, percent] = p.split(":").map(Number);
        return { minQty, percent };
      })
      .filter((t) => t.minQty && t.percent);
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          priority: Number(priority),
          slaDueAt: slaDueAt || null,
          vatRate: Number(vatRate),
          discountTiers: parseTiers(),
          items: rows.filter((r) => r.variantId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShow(false);
      setCustomerName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function simulate(order: SO) {
    setLoading(true);
    setError("");
    setSim(null);
    try {
      const lines = order.lines
        .map((l) => ({
          lineId: l.id,
          quantity: fulfillQty[l.id] ?? Math.max(0, l.qtyOrdered - l.qtyFulfilled),
        }))
        .filter((l) => l.quantity > 0);
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate", lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSim(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function fulfill(order: SO) {
    setLoading(true);
    setError("");
    setToast("");
    try {
      const lines = order.lines
        .map((l) => ({
          lineId: l.id,
          quantity: fulfillQty[l.id] ?? Math.max(0, l.qtyOrdered - l.qtyFulfilled),
        }))
        .filter((l) => l.quantity > 0);
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fulfill", lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      const fail = data.results?.filter((r: { ok: boolean }) => !r.ok).length || 0;
      setToast(fail ? `ניפוק חלקי · ${fail} נכשלו (נוספו להמתנה אם חסר מלאי)` : "נופק בהצלחה");
      setActiveId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(order: SO, status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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

  async function makeDoc(order: SO, type: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "document", type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setToast(`נוצר מסמך ${data.number} · סה״כ ₪${data.total}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function saveShipping(order: SO, carrier: string, ref: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCarrier: carrier, shippingRef: ref }),
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

  const statusLabel = (c: string) => SO_STATUSES.find((s) => s.code === c)?.label || c;
  const slaTone = (sla: string | null) => {
    if (!sla) return "neutral" as const;
    const t = new Date(sla).getTime() - Date.now();
    if (t < 0) return "danger" as const;
    if (t < 1000 * 60 * 60 * 4) return "warn" as const;
    return "ok" as const;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShoppingCart className="h-5 w-5 text-[var(--accent)]" />
              הזמנות לקוח · תור ניפוק
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              עדיפות + SLA · ניפוק חלקי · סימולציה · חשבונית/תעודת משלוח · מע״מ והנחות מדרגות
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShow((v) => !v)}>
            {show ? "סגור" : "הזמנה חדשה"}
          </Button>
        </div>

        {show && (
          <form onSubmit={createOrder} className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>לקוח</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
              </div>
              <div>
                <Label>עדיפות (1 גבוה)</Label>
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>SLA עד</Label>
                <Input type="datetime-local" value={slaDueAt} onChange={(e) => setSlaDueAt(e.target.value)} />
              </div>
              <div>
                <Label>מע״מ %</Label>
                <Input type="number" min={0} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>הנחות מדרגות (כמות:אחוז,…)</Label>
                <Input value={tiers} onChange={(e) => setTiers(e.target.value)} placeholder="10:5,50:10" />
              </div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_90px_100px]">
                <Select
                  value={row.variantId}
                  onChange={(e) => {
                    const v = variants.find((x) => x.id === e.target.value);
                    const next = [...rows];
                    next[i] = {
                      variantId: e.target.value,
                      quantity: row.quantity,
                      unitPrice: v?.product.sellingPrice || 0,
                    };
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
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, unitPrice: Number(e.target.value) || 0 };
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
                    {
                      variantId: variants[0]?.id || "",
                      quantity: 1,
                      unitPrice: variants[0]?.product.sellingPrice || 0,
                    },
                  ])
                }
              >
                שורה
              </Button>
              <Button type="submit" disabled={loading || !variants.length}>
                צור הזמנה
              </Button>
            </div>
          </form>
        )}

        <ul className="space-y-3">
          {orders.length === 0 && (
            <p className="text-sm text-[var(--muted)]">אין הזמנות</p>
          )}
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {o.number} · {o.customerName}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span>עדיפות {o.priority}</span>
                    {o.slaDueAt && (
                      <Badge tone={slaTone(o.slaDueAt)}>
                        SLA {formatDateTime(o.slaDueAt)}
                      </Badge>
                    )}
                    {o.shippingCarrier && (
                      <span>
                        <Truck className="inline h-3 w-3" /> {o.shippingCarrier}
                        {o.shippingRef ? ` · ${o.shippingRef}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge
                    tone={
                      o.status === "SHIPPED" || o.status === "FULFILLED"
                        ? "ok"
                        : o.status === "PARTIAL"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    {statusLabel(o.status)}
                  </Badge>
                  {(o.status === "OPEN" || o.status === "PARTIAL") && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveId(activeId === o.id ? null : o.id)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      ניפוק
                    </Button>
                  )}
                  {(o.status === "FULFILLED" || o.status === "PACKED") && (
                    <>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setStatus(o, "PACKED")}>
                        ארוז
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setStatus(o, "SHIPPED")}>
                        יצא
                      </Button>
                    </>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => makeDoc(o, "DELIVERY_NOTE")}>
                    <FileText className="h-3.5 w-3.5" />
                    ת.משלוח
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => makeDoc(o, "INVOICE")}>
                    חשבונית
                  </Button>
                </div>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                {o.lines.map((l) => (
                  <li key={l.id}>
                    {l.variant.sku}: {l.qtyFulfilled}/{l.qtyOrdered} · ₪{l.unitPrice}
                  </li>
                ))}
              </ul>

              {activeId === o.id && (
                <div className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  {o.lines.map((l) => {
                    const rem = l.qtyOrdered - l.qtyFulfilled;
                    if (rem <= 0) return null;
                    return (
                      <div key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="min-w-[140px]">{l.variant.sku} (נותר {rem})</span>
                        <Input
                          className="w-24"
                          type="number"
                          min={1}
                          max={rem}
                          value={fulfillQty[l.id] ?? rem}
                          onChange={(e) =>
                            setFulfillQty({
                              ...fulfillQty,
                              [l.id]: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={loading} onClick={() => simulate(o)}>
                      מה אם אנפק?
                    </Button>
                    <Button type="button" disabled={loading} onClick={() => fulfill(o)}>
                      אשר ניפוק
                    </Button>
                  </div>
                  {sim && (
                    <ul className="text-xs">
                      {sim.results.map((r, i) => (
                        <li key={i} className={r.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
                          {r.ok ? "✓" : "✗"} {r.sku} — מבוקש {r.requested} / זמין {r.available}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="שליח / חברה"
                      defaultValue={o.shippingCarrier || ""}
                      id={`carrier-${o.id}`}
                    />
                    <Input
                      placeholder="מס׳ מעקב"
                      defaultValue={o.shippingRef || ""}
                      id={`ref-${o.id}`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const carrier = (
                          document.getElementById(`carrier-${o.id}`) as HTMLInputElement
                        )?.value;
                        const ref = (
                          document.getElementById(`ref-${o.id}`) as HTMLInputElement
                        )?.value;
                        saveShipping(o, carrier, ref);
                      }}
                    >
                      שמור שליחות
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
