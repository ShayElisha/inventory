"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { PO_STATUSES } from "@/lib/constants";
import { PackagePlus, Play } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  product: { title: string };
};

type Location = { id: string; code: string };
type Supplier = { id: string; name: string };

type PO = {
  id: string;
  number: string;
  status: string;
  invoiceNumber: string | null;
  supplier: { name: string } | null;
  lines: {
    id: string;
    qtyOrdered: number;
    qtyReceived: number;
    variant: { sku: string; product: { title: string } };
  }[];
};

export function PurchaseOrdersPanel({
  orders,
  variants,
  locations,
  suppliers,
}: {
  orders: PO[];
  variants: Variant[];
  locations: Location[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [rows, setRows] = useState([{ variantId: variants[0]?.id || "", quantity: 1, unitCost: 0 }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [recv, setRecv] = useState<
    Record<string, { quantity: number; locationId: string; lotCode: string; expiryDate: string }>
  >({});

  async function createPo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || null,
          invoiceNumber,
          items: rows.filter((r) => r.variantId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShow(false);
      setInvoiceNumber("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function receive(po: PO) {
    setLoading(true);
    setError("");
    try {
      const receipts = po.lines
        .map((l) => {
          const r = recv[l.id];
          if (!r || !r.quantity) return null;
          return {
            lineId: l.id,
            quantity: r.quantity,
            locationId: r.locationId || undefined,
            lotCode: r.lotCode || undefined,
            expiryDate: r.expiryDate || undefined,
          };
        })
        .filter(Boolean);
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipts, invoiceNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setReceiveId(null);
      setRecv({});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = (c: string) =>
    PO_STATUSES.find((s) => s.code === c)?.label || c;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <PackagePlus className="h-5 w-5 text-[var(--accent)]" />
              הזמנות רכש (PO)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              קליטה חלקית, חשבונית ספק, פיצול למיקומים ואצווה+תוקף
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShow((v) => !v)}>
            {show ? "סגור" : "הזמנה חדשה"}
          </Button>
        </div>

        {show && (
          <form onSubmit={createPo} className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>ספק</Label>
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">ללא</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>מס׳ חשבונית ספק</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="לסריקה / הזנה" />
              </div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_90px_90px]">
                <Select
                  value={row.variantId}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, variantId: e.target.value };
                    setRows(next);
                  }}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.sku} — {v.product.title}</option>
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
                  value={row.unitCost}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, unitCost: Number(e.target.value) || 0 };
                    setRows(next);
                  }}
                  placeholder="עלות"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setRows([...rows, { variantId: variants[0]?.id || "", quantity: 1, unitCost: 0 }])}>
                שורה
              </Button>
              <Button type="submit" disabled={loading || !variants.length}>צור PO</Button>
            </div>
          </form>
        )}

        <ul className="space-y-3">
          {orders.length === 0 && (
            <p className="text-sm text-[var(--muted)]">אין הזמנות רכש</p>
          )}
          {orders.map((po) => (
            <li key={po.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{po.number}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {po.supplier?.name || "ללא ספק"}
                    {po.invoiceNumber ? ` · חשבונית ${po.invoiceNumber}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={po.status === "RECEIVED" ? "ok" : po.status === "PARTIAL" ? "warn" : "neutral"}>
                    {statusLabel(po.status)}
                  </Badge>
                  {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                    <Button type="button" size="sm" onClick={() => setReceiveId(receiveId === po.id ? null : po.id)}>
                      <Play className="h-3.5 w-3.5" />
                      קליטה
                    </Button>
                  )}
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                {po.lines.map((l) => (
                  <li key={l.id}>
                    {l.variant.sku} — {l.variant.product.title}: {l.qtyReceived}/{l.qtyOrdered}
                  </li>
                ))}
              </ul>

              {receiveId === po.id && (
                <div className="mt-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div>
                    <Label>מס׳ חשבונית (אופציונלי)</Label>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                  </div>
                  {po.lines.map((l) => {
                    const rem = l.qtyOrdered - l.qtyReceived;
                    if (rem <= 0) return null;
                    const r = recv[l.id] || { quantity: rem, locationId: "", lotCode: "", expiryDate: "" };
                    return (
                      <div key={l.id} className="grid gap-2 sm:grid-cols-4">
                        <div className="text-xs sm:col-span-4">
                          {l.variant.sku} (נותר {rem})
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={rem}
                          value={r.quantity}
                          onChange={(e) =>
                            setRecv({
                              ...recv,
                              [l.id]: { ...r, quantity: Number(e.target.value) || 0 },
                            })
                          }
                        />
                        <Select
                          value={r.locationId}
                          onChange={(e) =>
                            setRecv({ ...recv, [l.id]: { ...r, locationId: e.target.value } })
                          }
                        >
                          <option value="">מיקום</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>{loc.code}</option>
                          ))}
                        </Select>
                        <Input
                          placeholder="אצווה"
                          value={r.lotCode}
                          onChange={(e) =>
                            setRecv({ ...recv, [l.id]: { ...r, lotCode: e.target.value } })
                          }
                        />
                        <Input
                          type="date"
                          value={r.expiryDate}
                          onChange={(e) =>
                            setRecv({ ...recv, [l.id]: { ...r, expiryDate: e.target.value } })
                          }
                        />
                      </div>
                    );
                  })}
                  <Button type="button" disabled={loading} onClick={() => receive(po)}>
                    אשר קליטה
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
