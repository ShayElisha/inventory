"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { Warehouse } from "lucide-react";

type Opt = { id: string; name?: string; code?: string };
type Variant = { id: string; sku: string; product: { title: string } };

type Transfer = {
  id: string;
  number: string;
  status: string;
  fromWarehouse: Opt | null;
  toWarehouse: Opt | null;
  lines: {
    id: string;
    qtyRequested: number;
    qtyShipped: number;
    qtyReceived: number;
    variant: { sku: string; product: { title: string } };
  }[];
};

const STATUS: Record<string, string> = {
  DRAFT: "טיוטה",
  IN_TRANSIT: "בדרך",
  RECEIVED: "התקבל",
  CANCELLED: "בוטל",
};

export function TransfersPanel({
  transfers,
  variants,
  warehouses,
  locations,
}: {
  transfers: Transfer[];
  variants: Variant[];
  warehouses: Opt[];
  locations: Opt[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?.id || "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id || warehouses[0]?.id || "");
  const [rows, setRows] = useState([
    {
      variantId: variants[0]?.id || "",
      qtyRequested: 1,
      fromLocationId: locations[0]?.id || "",
      toLocationId: locations[0]?.id || "",
    },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: fromWarehouseId || null,
          toWarehouseId: toWarehouseId || null,
          items: rows.filter((r) => r.variantId),
        }),
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
      const res = await fetch(`/api/transfers/${id}`, {
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
        <p className="text-sm text-[var(--muted)]">העברה בין מחסנים · יציאה ואז קבלה</p>
        <Button type="button" onClick={() => setShow((v) => !v)}>
          <Warehouse className="h-4 w-4" />
          העברה חדשה
        </Button>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {show && (
        <Card>
          <form onSubmit={create} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>ממחסן</Label>
                <Select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)}>
                  <option value="">—</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name || w.code}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>למחסן</Label>
                <Select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)}>
                  <option value="">—</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name || w.code}</option>
                  ))}
                </Select>
              </div>
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-4">
                <Select
                  value={row.variantId}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, variantId: e.target.value };
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
                  value={row.qtyRequested}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, qtyRequested: Number(e.target.value) || 1 };
                    setRows(next);
                  }}
                />
                <Select
                  value={row.fromLocationId}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, fromLocationId: e.target.value };
                    setRows(next);
                  }}
                >
                  <option value="">ממיקום</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </Select>
                <Select
                  value={row.toLocationId}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, toLocationId: e.target.value };
                    setRows(next);
                  }}
                >
                  <option value="">למיקום</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.code}</option>
                  ))}
                </Select>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>צור</Button>
              <Button type="button" variant="secondary" onClick={() => setShow(false)}>ביטול</Button>
            </div>
          </form>
        </Card>
      )}
      <div className="space-y-3">
        {transfers.map((t) => (
          <Card key={t.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">{t.number}</span>{" "}
                <Badge>{STATUS[t.status] || t.status}</Badge>
                <p className="text-sm text-[var(--muted)]">
                  {t.fromWarehouse?.name || "—"} → {t.toWarehouse?.name || "—"}
                </p>
              </div>
              <div className="flex gap-2">
                {t.status === "DRAFT" && (
                  <Button size="sm" disabled={loading} onClick={() => act(t.id, "ship")}>שלח</Button>
                )}
                {t.status === "IN_TRANSIT" && (
                  <Button size="sm" disabled={loading} onClick={() => act(t.id, "receive")}>קבל</Button>
                )}
              </div>
            </div>
            <ul className="text-sm">
              {t.lines.map((l) => (
                <li key={l.id} className="flex justify-between border-t border-[var(--border)] py-1">
                  <span>{l.variant.sku} — {l.variant.product.title}</span>
                  <span className="text-[var(--muted)]">
                    {l.qtyReceived}/{l.qtyShipped}/{l.qtyRequested}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
        {transfers.length === 0 && (
          <Card><p className="py-6 text-center text-sm text-[var(--muted)]">אין העברות</p></Card>
        )}
      </div>
    </div>
  );
}
