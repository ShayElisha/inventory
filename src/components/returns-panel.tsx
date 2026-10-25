"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { RMA_REASONS, RMA_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Undo2, Check, Banknote } from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  product: { title: string };
};

type Customer = { id: string; name: string };
type SalesOrder = { id: string; number: string; customerName: string };

type Rma = {
  id: string;
  number: string;
  status: string;
  reason: string | null;
  reasonCode: string | null;
  creditAmount: number | null;
  notes: string | null;
  createdAt: string;
  customer: Customer | null;
  salesOrder: { id: string; number: string } | null;
  lines: {
    id: string;
    qtyRequested: number;
    qtyReceived: number;
    condition: string;
    restock: boolean;
    variant: { sku: string; product: { title: string } };
  }[];
};

function statusLabel(code: string) {
  return RMA_STATUSES.find((s) => s.code === code)?.label || code;
}

function statusTone(code: string): "neutral" | "ok" | "warn" | "danger" {
  if (code === "CREDITED" || code === "RECEIVED") return "ok";
  if (code === "OPEN" || code === "INSPECTED") return "warn";
  if (code === "REJECTED" || code === "CANCELLED") return "danger";
  return "neutral";
}

export function ReturnsPanel({
  returns,
  variants,
  customers,
  salesOrders,
}: {
  returns: Rma[];
  variants: Variant[];
  customers: Customer[];
  salesOrders: SalesOrder[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [reasonCode, setReasonCode] = useState("OTHER");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState([
    { variantId: variants[0]?.id || "", qtyRequested: 1 },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  async function createRma(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          salesOrderId: salesOrderId || null,
          reasonCode,
          reason,
          notes,
          items: rows.filter((r) => r.variantId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShow(false);
      setReason("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function receive(rma: Rma) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/returns/${rma.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          lines: rma.lines.map((l) => ({
            lineId: l.id,
            quantity: Math.max(0, l.qtyRequested - l.qtyReceived),
            restock: l.restock,
            condition: l.condition,
          })),
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

  async function credit(rma: Rma) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/returns/${rma.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "credit",
          creditAmount: creditAmount || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setActiveId(null);
      setCreditAmount("");
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
          החזרות לקוח · קבלה למלאי · זיכוי
        </p>
        <Button type="button" onClick={() => setShow((v) => !v)}>
          <Undo2 className="h-4 w-4" />
          החזרה חדשה
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {show && (
        <Card>
          <form onSubmit={createRma} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>לקוח</Label>
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">ללא</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>הזמנת מכירה</Label>
                <Select
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                >
                  <option value="">ללא</option>
                  {salesOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number} — {o.customerName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>סיבה</Label>
                <Select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                >
                  {RMA_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>פירוט</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>שורות</Label>
              {rows.map((row, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={row.variantId}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...row, variantId: e.target.value };
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
                    min={1}
                    value={row.qtyRequested}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...row,
                        qtyRequested: Math.max(1, Number(e.target.value) || 1),
                      };
                      setRows(next);
                    }}
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
                    { variantId: variants[0]?.id || "", qtyRequested: 1 },
                  ])
                }
              >
                הוסף שורה
              </Button>
            </div>
            <div>
              <Label>הערות</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !variants.length}>
                פתח החזרה
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

      <div className="space-y-3">
        {returns.map((rma) => (
          <Card key={rma.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{rma.number}</span>
                  <Badge tone={statusTone(rma.status)}>
                    {statusLabel(rma.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {rma.customer?.name || "ללא לקוח"}
                  {rma.salesOrder ? ` · הזמנה ${rma.salesOrder.number}` : ""}
                  {" · "}
                  {formatDateTime(rma.createdAt)}
                </p>
                {(rma.reasonCode || rma.reason) && (
                  <p className="mt-1 text-sm">
                    {RMA_REASONS.find((x) => x.code === rma.reasonCode)?.label ||
                      rma.reasonCode}
                    {rma.reason ? ` — ${rma.reason}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {rma.status === "OPEN" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={loading}
                    onClick={() => receive(rma)}
                  >
                    <Check className="h-4 w-4" />
                    קבל למלאי
                  </Button>
                )}
                {(rma.status === "RECEIVED" || rma.status === "INSPECTED") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={loading}
                    onClick={() => {
                      setActiveId(rma.id);
                      setCreditAmount(
                        rma.creditAmount != null ? String(rma.creditAmount) : ""
                      );
                    }}
                  >
                    <Banknote className="h-4 w-4" />
                    זיכוי
                  </Button>
                )}
              </div>
            </div>

            <ul className="space-y-1 text-sm">
              {rma.lines.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-1"
                >
                  <span>
                    {l.variant.sku} — {l.variant.product.title}
                  </span>
                  <span className="text-[var(--muted)]">
                    {l.qtyReceived}/{l.qtyRequested}
                    {l.restock ? " · החזרה למלאי" : " · ללא החזרה"}
                  </span>
                </li>
              ))}
            </ul>

            {activeId === rma.id && (
              <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3">
                <div>
                  <Label>סכום זיכוי</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => credit(rma)}
                >
                  אשר זיכוי
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveId(null)}
                >
                  ביטול
                </Button>
              </div>
            )}
          </Card>
        ))}
        {returns.length === 0 && (
          <Card>
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              אין החזרות עדיין
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
