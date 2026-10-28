"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, Select } from "@/components/ui";
import {
  DOCUMENT_TYPES,
  documentTypeLabel,
  parseDocumentPayload,
} from "@/lib/documents";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Eye, FileText, Printer } from "lucide-react";

type Doc = {
  id: string;
  type: string;
  number: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  payloadJson: string;
  createdAt: string;
  salesOrder?: {
    id: string;
    number: string;
    customerName: string | null;
  } | null;
  purchaseOrder?: { id: string; number: string } | null;
};

export function DocumentsPanel({ documents }: { documents: Doc[] }) {
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    if (!typeFilter) return documents;
    return documents.filter((d) => d.type === typeFilter);
  }, [documents, typeFilter]);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-sm font-medium">סוג מסמך</label>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">הכל</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <p className="pb-2 text-sm text-[var(--muted)]">
          {filtered.length} מסמכים
        </p>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            אין מסמכים עדיין. אפשר ליצור חשבונית או תעודת משלוח ממסך{" "}
            <Link href="/orders" className="text-[var(--accent)] underline">
              הזמנות לקוח
            </Link>
            .
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => {
            const payload = parseDocumentPayload(d.payloadJson);
            const customer =
              payload.customerName || d.salesOrder?.customerName || "—";
            return (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold">
                        {d.number}
                      </span>
                      <Badge
                        tone={
                          d.type === "INVOICE"
                            ? "ok"
                            : d.type === "CREDIT_NOTE" || d.type === "RMA"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {documentTypeLabel(d.type)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {customer}
                      {d.salesOrder?.number
                        ? ` · הזמנה ${d.salesOrder.number}`
                        : ""}
                      {" · "}
                      {formatDateTime(d.createdAt)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {d.type === "DELIVERY_NOTE"
                      ? "—"
                      : formatCurrency(d.total)}
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/documents/${d.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                    >
                      <Eye className="h-4 w-4" />
                      צפייה
                    </Link>
                    <Link
                      href={`/documents/${d.id}?print=1`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                    >
                      <Printer className="h-4 w-4" />
                      הדפסה
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
