"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { Truck } from "lucide-react";

type SO = { id: string; number: string; customerName: string };
type Shipment = {
  id: string;
  number: string;
  status: string;
  carrier: string | null;
  trackingRef: string | null;
  salesOrder: SO;
  packages: {
    id: string;
    label: string | null;
    items: { quantity: number; variant: { sku: string; product: { title: string } } }[];
  }[];
};

const STATUS: Record<string, string> = {
  DRAFT: "טיוטה",
  PACKED: "ארוז",
  SHIPPED: "נשלח",
  DELIVERED: "נמסר",
  CANCELLED: "בוטל",
};

export function ShipmentsPanel({
  shipments,
  salesOrders,
}: {
  shipments: Shipment[];
  salesOrders: SO[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [salesOrderId, setSalesOrderId] = useState(salesOrders[0]?.id || "");
  const [carrier, setCarrier] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesOrderId, carrier, trackingRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShow(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
      <div className="flex justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">אריזה · משלוח · מס׳ מעקב</p>
        <Button type="button" onClick={() => setShow((v) => !v)} disabled={!salesOrders.length}>
          <Truck className="h-4 w-4" />
          משלוח חדש
        </Button>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {show && (
        <Card>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label>הזמנה</Label>
              <Select value={salesOrderId} onChange={(e) => setSalesOrderId(e.target.value)}>
                {salesOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.number} — {o.customerName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>מוביל</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </div>
            <div>
              <Label>מעקב</Label>
              <Input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={loading}>צור</Button>
              <Button type="button" variant="secondary" onClick={() => setShow(false)}>ביטול</Button>
            </div>
          </form>
        </Card>
      )}
      <div className="space-y-3">
        {shipments.map((s) => (
          <Card key={s.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">{s.number}</span>{" "}
                <Badge>{STATUS[s.status] || s.status}</Badge>
                <p className="text-sm text-[var(--muted)]">
                  הזמנה {s.salesOrder.number} · {s.salesOrder.customerName}
                  {s.carrier ? ` · ${s.carrier}` : ""}
                  {s.trackingRef ? ` · ${s.trackingRef}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {s.status === "DRAFT" && (
                  <Button size="sm" disabled={loading} onClick={() => act(s.id, "pack")}>ארוז</Button>
                )}
                {(s.status === "DRAFT" || s.status === "PACKED") && (
                  <Button size="sm" disabled={loading} onClick={() => act(s.id, "ship")}>שלח</Button>
                )}
                {s.status === "SHIPPED" && (
                  <Button size="sm" disabled={loading} onClick={() => act(s.id, "deliver")}>נמסר</Button>
                )}
              </div>
            </div>
            {s.packages.map((p) => (
              <ul key={p.id} className="text-sm">
                <li className="font-medium text-[var(--muted)]">{p.label || "חבילה"}</li>
                {p.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between border-t border-[var(--border)] py-1">
                    <span>{i.variant.sku} — {i.variant.product.title}</span>
                    <span>×{i.quantity}</span>
                  </li>
                ))}
              </ul>
            ))}
          </Card>
        ))}
        {shipments.length === 0 && (
          <Card><p className="py-6 text-center text-sm text-[var(--muted)]">אין משלוחים</p></Card>
        )}
      </div>
    </div>
  );
}
