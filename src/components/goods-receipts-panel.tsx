"use client";

import { Badge, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { ClipboardCheck } from "lucide-react";

type Receipt = {
  id: string;
  number: string;
  status: string;
  receivedAt: string | null;
  notes: string | null;
  purchaseOrder: { id: string; number: string };
  lines: {
    id: string;
    qtyExpected: number;
    qtyReceived: number;
    qtyDamaged: number;
    notes: string | null;
    variant: { sku: string; product: { title: string } };
  }[];
};

export function GoodsReceiptsPanel({ receipts }: { receipts: Receipt[] }) {
  if (!receipts.length) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">
          עדיין אין תעודות קליטה — כל קליטה מול הזמנת רכש תיצור תעודה כאן.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" />
        תעודות קליטה
      </h2>
      <ul className="space-y-3">
        {receipts.map((r) => {
          const damaged = r.lines.reduce((s, l) => s + l.qtyDamaged, 0);
          const good = r.lines.reduce((s, l) => s + l.qtyReceived, 0);
          return (
            <li
              key={r.id}
              className="rounded-xl border border-[var(--border)] px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {r.number} · PO {r.purchaseOrder.number}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    {r.receivedAt
                      ? formatDateTime(r.receivedAt)
                      : "ללא תאריך"}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="ok">תקין {good}</Badge>
                  {damaged > 0 && <Badge tone="warn">נזק {damaged}</Badge>}
                </div>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-[var(--muted)]">
                {r.lines.map((l) => (
                  <li key={l.id}>
                    {l.variant.sku} — {l.variant.product.title}: תקין{" "}
                    {l.qtyReceived}
                    {l.qtyDamaged ? ` · נזק ${l.qtyDamaged}` : ""}
                    {l.qtyExpected
                      ? ` · צפוי היה ${l.qtyExpected}`
                      : ""}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
