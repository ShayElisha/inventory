"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { Bell, Check, Trash2, X } from "lucide-react";

type Item = {
  id: string;
  quantity: number;
  customerName: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  variant: {
    id: string;
    sku: string;
    quantityOnHand: number;
    product: { title: string };
  };
  customer: { id: string; name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "פתוח",
  NOTIFIED: "נודע ללקוח",
  FULFILLED: "סופק",
  CANCELLED: "בוטל",
};

export function WaitlistPanel({ items }: { items: Item[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? items
        : items.filter((i) => i.status === statusFilter),
    [items, statusFilter]
  );

  async function setStatus(id: string, status: string) {
    setLoading(id);
    setError("");
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("למחוק מהרשימה?")) return;
    setLoading(id);
    setError("");
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="OPEN">פתוחים</option>
          <option value="NOTIFIED">נודע ללקוח</option>
          <option value="FULFILLED">סופקו</option>
          <option value="CANCELLED">בוטלו</option>
          <option value="ALL">הכל</option>
        </Select>
        <span className="text-sm text-[var(--muted)]">
          {filtered.length} פריטים
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <Card>
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">אין פריטים בתור</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {item.variant.sku} — {item.variant.product.title}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    כמות {item.quantity} · מלאי נוכחי{" "}
                    {item.variant.quantityOnHand} ·{" "}
                    {item.customer?.name || item.customerName || "ללא לקוח"} ·{" "}
                    {formatDateTime(item.createdAt)}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge
                    tone={
                      item.status === "FULFILLED"
                        ? "ok"
                        : item.status === "CANCELLED"
                          ? "neutral"
                          : item.status === "NOTIFIED"
                            ? "warn"
                            : "neutral"
                    }
                  >
                    {STATUS_LABEL[item.status] || item.status}
                  </Badge>
                  {item.status === "OPEN" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loading === item.id}
                      onClick={() => setStatus(item.id, "NOTIFIED")}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      סומן כנודע
                    </Button>
                  )}
                  {(item.status === "OPEN" || item.status === "NOTIFIED") && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading === item.id}
                      onClick={() => setStatus(item.id, "FULFILLED")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      סופק
                    </Button>
                  )}
                  {item.status !== "CANCELLED" && item.status !== "FULFILLED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={loading === item.id}
                      onClick={() => setStatus(item.id, "CANCELLED")}
                    >
                      <X className="h-3.5 w-3.5" />
                      בטל
                    </Button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    title="מחק"
                    disabled={loading === item.id}
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
