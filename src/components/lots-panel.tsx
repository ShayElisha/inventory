"use client";

import { Badge, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type Lot = {
  id: string;
  lotCode: string;
  quantity: number;
  expiryDate: string | null;
  variant: { sku: string; product: { title: string } };
  location: { code: string } | null;
};

export function LotsPanel({ lots }: { lots: Lot[] }) {
  const now = Date.now();
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-[var(--surface-2)] text-right text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">אצווה</th>
            <th className="px-3 py-2 font-medium">מוצר</th>
            <th className="px-3 py-2 font-medium">כמות</th>
            <th className="px-3 py-2 font-medium">מיקום</th>
            <th className="px-3 py-2 font-medium">תוקף</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((l) => {
            const exp = l.expiryDate ? new Date(l.expiryDate).getTime() : null;
            const days = exp != null ? Math.ceil((exp - now) / 86400000) : null;
            const tone =
              days == null ? "neutral" : days < 0 ? "danger" : days <= 30 ? "warn" : "ok";
            return (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono">{l.lotCode}</td>
                <td className="px-3 py-2">
                  {l.variant.product.title}{" "}
                  <span className="font-mono text-xs text-[var(--muted)]">{l.variant.sku}</span>
                </td>
                <td className="px-3 py-2">{l.quantity}</td>
                <td className="px-3 py-2">{l.location?.code || "—"}</td>
                <td className="px-3 py-2">
                  {l.expiryDate ? (
                    <Badge tone={tone as "neutral" | "ok" | "warn" | "danger"}>
                      {formatDateTime(l.expiryDate)}
                      {days != null ? ` · ${days}י׳` : ""}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
          {lots.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-[var(--muted)]">
                אין אצוות עם מלאי
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {lots.length === 0 && (
        <Card className="m-0 rounded-none border-0 shadow-none">
          <p className="sr-only">ריק</p>
        </Card>
      )}
    </div>
  );
}
