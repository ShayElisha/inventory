import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { PageHeader, Card, Badge } from "@/components/ui";
import { requireTenant } from "@/lib/tenant";
import {
  getCustomerReceivables,
  getSupplierPayables,
} from "@/lib/receivables";
import { formatCurrency } from "@/lib/utils";
import { assertPermission } from "@/lib/require-permission";
import { redirect } from "next/navigation";
import { ensureSchemaPatches } from "@/lib/db";

export default async function BalancesReportPage() {
  noStore();
  await ensureSchemaPatches();
  const session = await requireTenant();
  const perm = await assertPermission(session, "reports.view");
  if (!perm.ok) redirect("/dashboard");

  const [ar, ap] = await Promise.all([
    getCustomerReceivables(session.companyId),
    getSupplierPayables(session.companyId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="גבייה ויתרות"
        description="חובות לקוחות (AR) · התחייבויות רכש לספקים (AP)"
      />

      <section className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-[var(--muted)]">יתרת גבייה מלקוחות</p>
          <p className="mt-1 font-display text-2xl font-bold text-[var(--danger)]">
            {formatCurrency(ar.totals.due)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {ar.totals.count} חשבוניות פתוחות
          </p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)]">ערך PO פתוח לספקים</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {formatCurrency(ap.totals.openValue)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {ap.totals.count} הזמנות רכש
          </p>
        </Card>
      </section>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold">לקוחות — לגבייה</h2>
        {ar.customers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">אין יתרות חוב</p>
        ) : (
          <ul className="space-y-3">
            {ar.customers.map((c) => (
              <li
                key={c.customerKey}
                className="rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.customerName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {c.invoiceCount} חשבוניות
                    </p>
                  </div>
                  <Badge tone="danger">{formatCurrency(c.due)}</Badge>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                  {c.invoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between gap-2">
                      <Link
                        href={`/documents/${inv.id}`}
                        className="text-[var(--accent)] underline"
                      >
                        {inv.number}
                        {inv.orderNumber ? ` · ${inv.orderNumber}` : ""}
                      </Link>
                      <span>
                        {formatCurrency(inv.due)} / {formatCurrency(inv.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold">ספקים — רכש פתוח</h2>
        {ap.suppliers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">אין התחייבויות פתוחות</p>
        ) : (
          <ul className="space-y-3">
            {ap.suppliers.map((s) => (
              <li
                key={s.supplierId || s.supplierName}
                className="rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.supplierName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {s.poCount} הזמנות
                    </p>
                  </div>
                  <Badge tone="warn">{formatCurrency(s.openValue)}</Badge>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                  {s.orders.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2">
                      <Link
                        href="/purchases"
                        className="text-[var(--accent)] underline"
                      >
                        {o.number} · {o.status}
                      </Link>
                      <span>{formatCurrency(o.value)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
