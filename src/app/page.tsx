import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { attributesLabel, formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";


export default async function DashboardPage() {
  noStore();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [variants, lowStock, todayTxns, recentTxns, categories] = await Promise.all([
    prisma.productVariant.findMany({
      include: { product: { include: { category: true } } },
    }),
    prisma.productVariant.findMany({
      where: {},
      include: { product: true, location: true },
      orderBy: { quantityOnHand: "asc" },
    }),
    prisma.stockTransaction.findMany({
      where: { timestamp: { gte: startOfDay } },
    }),
    prisma.stockTransaction.findMany({
      take: 20,
      orderBy: { timestamp: "desc" },
      include: { variant: { include: { product: true } } },
    }),
    prisma.category.findMany({
      include: {
        products: {
          include: { variants: true },
        },
      },
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

  const inboundToday = todayTxns
    .filter((t) => t.type === "INBOUND")
    .reduce((s, t) => s + Math.abs(t.quantityChanged), 0);
  const outboundToday = todayTxns
    .filter((t) => t.type === "OUTBOUND")
    .reduce((s, t) => s + Math.abs(t.quantityChanged), 0);

  const byCategory = categories.map((c) => {
    const qty = c.products.reduce(
      (s, p) => s + p.variants.reduce((vs, v) => vs + v.quantityOnHand, 0),
      0
    );
    return { name: c.name, qty };
  });
  const maxCat = Math.max(...byCategory.map((c) => c.qty), 1);

  const typeLabel: Record<string, string> = {
    INBOUND: "כניסה",
    OUTBOUND: "יציאה",
    TRANSFER: "העברה",
    ADJUSTMENT: "התאמה",
  };

  return (
    <div>
      <PageHeader
        title="דשבורד מלאי"
        description="תמונת מצב בזמן אמת של מלאי, התראות ותנועות"
        actions={
          <div className="flex gap-2">
            <Link
              href="/pick"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              ניפוק מהיר
            </Link>
            <Link
              href="/scan"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              סריקה
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-sm text-slate-500">שווי מלאי (עלות)</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(valueCost)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            מכירה: {formatCurrency(valueSell)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">SKUs פעילים</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{variants.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">מתחת לסף מינימום</div>
          <div className="mt-2 text-2xl font-bold text-rose-700">{low.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">תנועות היום</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            +{inboundToday} / −{outboundToday}
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
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium text-slate-900">{v.product.title}</div>
                    <div className="text-xs text-slate-500">
                      {v.sku} · {attributesLabel(v.attributes)}
                    </div>
                    <div className="text-xs text-slate-400">
                      מיקום: {v.location?.code ?? "—"}
                    </div>
                  </div>
                  <Badge tone="danger">
                    {v.quantityOnHand} / מינ׳ {v.minAlertLevel}
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
                    className="h-full rounded-full bg-teal-600 transition-all"
                    style={{ width: `${(c.qty / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">תנועות אחרונות</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-slate-500">
                <th className="pb-2 font-medium">זמן</th>
                <th className="pb-2 font-medium">סוג</th>
                <th className="pb-2 font-medium">מוצר</th>
                <th className="pb-2 font-medium">שינוי</th>
                <th className="pb-2 font-medium">יתרה</th>
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
                  <td className="py-2.5">{t.newQuantity}</td>
                  <td className="py-2.5 text-slate-600">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
