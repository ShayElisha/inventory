"use client";

import { documentTypeLabel, parseDocumentPayload } from "@/lib/documents";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Doc = {
  id: string;
  type: string;
  number: string;
  subtotal: number;
  vatAmount: number;
  total: number;
  payloadJson: string;
  createdAt: string | Date;
  salesOrder?: {
    number: string;
    customerName: string | null;
    shippingCarrier?: string | null;
    shippingRef?: string | null;
  } | null;
  purchaseOrder?: { number: string } | null;
};

export function DocumentView({
  doc,
  companyName,
}: {
  doc: Doc;
  companyName: string;
}) {
  const payload = parseDocumentPayload(doc.payloadJson);
  const lines = payload.lines || [];
  const customer =
    payload.customerName || doc.salesOrder?.customerName || "—";
  const showPrices = doc.type === "INVOICE" || doc.type === "CREDIT_NOTE";

  return (
    <div className="document-print mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-white p-6 text-[var(--ink)] shadow-sm dark:bg-[var(--surface)] dark:text-[var(--foreground)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="font-display text-xl font-bold">{companyName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {documentTypeLabel(doc.type)}
          </p>
        </div>
        <div className="text-left text-sm">
          <p className="font-mono text-lg font-semibold">{doc.number}</p>
          <p className="text-[var(--muted)]">
            {formatDateTime(doc.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <span className="text-[var(--muted)]">לכבוד: </span>
          <span className="font-medium">{customer}</span>
        </div>
        {doc.salesOrder?.number && (
          <div>
            <span className="text-[var(--muted)]">הזמנה: </span>
            <span className="font-mono">{doc.salesOrder.number}</span>
          </div>
        )}
        {doc.salesOrder?.shippingCarrier && (
          <div>
            <span className="text-[var(--muted)]">שליח: </span>
            {doc.salesOrder.shippingCarrier}
            {doc.salesOrder.shippingRef
              ? ` · ${doc.salesOrder.shippingRef}`
              : ""}
          </div>
        )}
        {payload.discountPercent ? (
          <div>
            <span className="text-[var(--muted)]">הנחה: </span>
            {payload.discountPercent}%
          </div>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-right text-[var(--muted)]">
              <th className="pb-2 font-medium">קוד</th>
              <th className="pb-2 font-medium">תיאור</th>
              <th className="pb-2 font-medium">כמות</th>
              {showPrices && (
                <>
                  <th className="pb-2 font-medium">מחיר</th>
                  <th className="pb-2 font-medium">סה״כ</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={showPrices ? 5 : 3}
                  className="py-6 text-center text-[var(--muted)]"
                >
                  אין שורות במסמך
                </td>
              </tr>
            ) : (
              lines.map((l, i) => {
                const qty = Number(l.qty) || 0;
                const price = Number(l.unitPrice) || 0;
                return (
                  <tr key={i} className="border-b border-[var(--border)]/60">
                    <td className="py-2 font-mono text-xs">{l.sku || "—"}</td>
                    <td className="py-2">{l.title || "—"}</td>
                    <td className="py-2">{qty}</td>
                    {showPrices && (
                      <>
                        <td className="py-2">{formatCurrency(price)}</td>
                        <td className="py-2 font-medium">
                          {formatCurrency(qty * price)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showPrices && (
        <div className="mt-6 ms-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">לפני מע״מ</span>
            <span>{formatCurrency(doc.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">מע״מ</span>
            <span>{formatCurrency(doc.vatAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-bold">
            <span>סה״כ לתשלום</span>
            <span>{formatCurrency(doc.total)}</span>
          </div>
        </div>
      )}

      {!showPrices && (
        <p className="mt-6 text-sm text-[var(--muted)]">
          מסמך זה מאשר מסירה / קבלה של הפריטים לעיל.
        </p>
      )}

      {payload.notes && (
        <p className="mt-4 text-sm">
          <span className="text-[var(--muted)]">הערות: </span>
          {payload.notes}
        </p>
      )}
    </div>
  );
}
