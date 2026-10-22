import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { attributesLabel, formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { DashboardPeriod } from "@/components/dashboard-period";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { requireTenant } from "@/lib/tenant";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  noStore();
  const session = await requireTenant();
  const { period = "today" } = await searchParams;
  const now = new Date();
  const from =
    period === "week"
      ? startOfWeek(now, { weekStartsOn: 0 })
      : period === "month"
        ? startOfMonth(now)
        : startOfDay(now);

  const companyFilter = { product: { companyId: session.companyId } };

  const [variants, lowStock, periodTxns, recentTxns, categories] = await Promise.all([
    prisma.productVariant.findMany({
      where: companyFilter,
      include: { product: { include: { category: true } } },
    }),
    prisma.productVariant.findMany({
      where: companyFilter,
      include: { product: true, location: true },
      orderBy: { quantityOnHand: "asc" },
    }),
    prisma.stockTransaction.findMany({
      where: {
        timestamp: { gte: from },
        variant: companyFilter,
      },
    }),
    prisma.stockTransaction.findMany({
      where: { variant: companyFilter },
      take: 20,
      orderBy: { timestamp: "desc" },
      include: { variant: { include: { product: true } } },
    }),
    prisma.category.findMany({
      where: { companyId: session.companyId },
      include: { products: { include: { variants: true } } },
    }),
  ]);

  const low = lowStock.filter((v) => v.quantityOnHand <= v.minAlertLevel);
  const valueCost = variants.reduce(
    (sum, v) => sum + v.quantityOnHand * v.product.costPrice,
    0
  );
  const valueSell = variants.reduce(
    (sum, v) => sum + v.quantityOnHand * v.product.sellingPrice,
    0
  );
  const inbound = periodTxns
    .filter((t) => t.type === "INBOUND")
    .reduce((s, t) => s + Math.abs(t.quantityChanged), 0);
  const outbound = periodTxns
    .filter((t) => t.type === "OUTBOUND")
    .reduce((s, t) => s + Math.abs(t.quantityChanged), 0);

  const byCategory = categories.map((c) => ({
    name: c.name,
    qty: c.products.reduce(
      (s, p) => s + p.variants.reduce((vs, v) => vs + v.quantityOnHand, 0),
      0
    ),
  }));
  const maxCat = Math.max(...byCategory.map((c) => c.qty), 1);

  const typeLabel: Record<string, string> = {
    INBOUND: "כניסה",
    OUTBOUND: "יציאה",
    TRANSFER: "העברה",
    ADJUSTMENT: "התאמה",
  };

  const periodLabel =
    period === "week" ? "השבוע" : period === "month" ? "החודש" : "היום";

  return (
    <div>
      <PageHeader
        title="דשבורד מלאי"
        description={`תמונת מצב · תקופה: ${periodLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Suspense>
              <DashboardPeriod />
            </Suspense>
            <Link
              href="/pick"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              ניפוק
            </Link>
            <Link
              href="/inbound"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              קליטה
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-sm text-slate-500">שווי מלאי (עלות)</div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(valueCost)}</div>
          <div className="mt-1 text-xs text-slate-500">
            מכירה: {formatCurrency(valueSell)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">SKUs פעילים</div>
          <div className="mt-2 text-2xl font-bold">{variants.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">מתחת לסף</div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{low.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">תנועות {periodLabel}</div>
          <div className="mt-2 text-2xl font-bold">
            +{inbound} / −{outbound}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">התראות מלאי חסר</h2>
          {low.length === 0 ? (
            <p className="text-sm text-slate-500">אין התראות כרגע</p>
          ) : (
            <ul className="space-y-3">
              {low.slice(0, 8).map((v) => (
                <li key={v.id} className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="font-medium">{v.product.title}</div>
                    <div className="text-xs text-slate-500">
                      {v.sku} · {attributesLabel(v.attributes)}
                    </div>
                  </div>
                  <Badge tone="danger">
                    {v.quantityOnHand} / {v.minAlertLevel}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">התפלגות לפי קטגוריה</h2>
          <div className="space-y-3">
            {byCategory.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium">{c.qty}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{ width: `${(c.qty / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-4 text-lg font-semibold">תנועות אחרונות</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-right text-slate-500">
              <th className="pb-2 font-medium">זמן</th>
              <th className="pb-2 font-medium">סוג</th>
              <th className="pb-2 font-medium">מוצר</th>
              <th className="pb-2 font-medium">שינוי</th>
              <th className="pb-2 font-medium">סיבה</th>
            </tr>
          </thead>
          <tbody>
            {recentTxns.map((t) => (
              <tr key={t.id} className="border-b border-slate-50">
                <td className="py-2.5 text-slate-500">{formatDateTime(t.timestamp)}</td>
                <td className="py-2.5">
                  <Badge
                    tone={
                      t.type === "INBOUND"
                        ? "ok"
                        : t.type === "OUTBOUND"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {typeLabel[t.type] ?? t.type}
                  </Badge>
                </td>
                <td className="py-2.5">
                  <div className="font-medium">{t.variant.product.title}</div>
                  <div className="text-xs text-slate-400">{t.variant.sku}</div>
                </td>
                <td className="py-2.5 font-mono">
                  {t.quantityChanged > 0 ? `+${t.quantityChanged}` : t.quantityChanged}
                </td>
                <td className="py-2.5 text-slate-600">{t.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
