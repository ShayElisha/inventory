"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  UNPAID: "לא שולם",
  PARTIAL: "שולם חלקית",
  PAID: "שולם",
  VOID: "מבוטל",
};

export function DocumentPayment({
  docId,
  type,
  total,
  paidAmount,
  paymentStatus,
}: {
  docId: string;
  type: string;
  total: number;
  paidAmount: number;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(paidAmount || ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (type !== "INVOICE" && type !== "CREDIT_NOTE") return null;

  const due = Math.max(0, total - (paidAmount || 0));

  async function save(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${docId}`, {
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
      setLoading(false);
    }
  }

  return (
    <Card className="print:hidden space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold">תשלום וגבייה</h3>
        <Badge
          tone={
            paymentStatus === "PAID"
              ? "ok"
              : paymentStatus === "PARTIAL"
                ? "warn"
                : "neutral"
          }
        >
          {STATUS_LABEL[paymentStatus] || paymentStatus}
        </Badge>
      </div>
      <p className="text-sm text-[var(--muted)]">
        סה״כ {formatCurrency(total)} · שולם {formatCurrency(paidAmount || 0)} ·
        יתרה {formatCurrency(due)}
      </p>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[120px]">
          <Label>סכום ששולם</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => save({ paidAmount: Number(amount) || 0 })}
        >
          עדכון
        </Button>
        <Button
          size="sm"
          disabled={loading || paymentStatus === "PAID"}
          onClick={() => save({ markPaid: true })}
        >
          סמן כשולם
        </Button>
        {paymentStatus !== "UNPAID" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => save({ paymentStatus: "UNPAID" })}
          >
            אפס
          </Button>
        )}
      </div>
    </Card>
  );
}
