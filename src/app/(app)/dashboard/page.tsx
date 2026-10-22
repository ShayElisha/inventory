import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import Link from "next/link";
import {
  PackageMinus,
  PackagePlus,
  ClipboardList,
  Calculator,
  ScanBarcode,
  BarChart3,
  Package,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Boxes,
  TrendingDown,
  TrendingUp,
  Bell,
  CircleHelp,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { DashboardPeriod } from "@/components/dashboard-period";
import { getCompanyModules, requireTenant } from "@/lib/tenant";
import { canAdmin, canWrite } from "@/lib/auth";
import { ROLE_LABELS, Role, ROLES } from "@/lib/constants";
import { attributesLabel, formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";

const typeLabel: Record<string, string> = {
  INBOUND: "כניסה",
  OUTBOUND: "יציאה",
  TRANSFER: "העברה",
  ADJUSTMENT: "התאמה",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  return "ערב טוב";
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "ok" | "warn" | "accent";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        tone === "danger" && "border-[var(--danger)]/25",
        tone === "ok" && "border-[var(--ok)]/25",
        tone === "warn" && "border-[var(--warn)]/30",
        tone === "accent" && "border-[var(--accent)]/25"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium tracking-wide text-[var(--muted)]">
            {label}
          </div>
          <div
            className={cn(
              "mt-2 font-display text-2xl font-bold tabular-nums tracking-tight",
              tone === "danger" && "text-[var(--danger)]",
              tone === "ok" && "text-[var(--ok)]",
              tone === "warn" && "text-[var(--warn)]",
              tone === "accent" && "text-[var(--accent)]"
            )}
          >
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
          )}
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)]",
              tone === "ok" && "bg-[var(--ok-soft)] text-[var(--ok)]",
              tone === "warn" && "bg-[var(--warn-soft)] text-[var(--warn)]",
              tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
              tone === "default" && "bg-[var(--surface-2)] text-[var(--muted)]"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </Card>
  );
}

function ActionTile({
  href,
  label,
  desc,
  icon: Icon,
  tone = "default",
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "danger" | "accent" | "lime";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40",
        tone === "danger" && "hover:border-[var(--danger)]/40",
        tone === "lime" && "border-[var(--lime)]/35 bg-[var(--accent-soft)]"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105",
          tone === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)]",
          tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
          tone === "lime" && "bg-[var(--lime)] text-[var(--ink)]",
          tone === "default" && "bg-[var(--surface-2)] text-[var(--foreground)]"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-sm font-semibold text-[var(--foreground)]">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">{desc}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  noStore();
  const session = await requireTenant();
  const modules = await getCompanyModules(session.companyId);
  const { period = "today" } = await searchParams;
  const now = new Date();
  const from =
    period === "week"
      ? startOfWeek(now, { weekStartsOn: 0 })
      : period === "month"
        ? startOfMonth(now)
        : startOfDay(now);
  const deadSince = subDays(now, 30);
  const companyId = session.companyId;
  const companyFilter = { product: { companyId } };
  const operate = canWrite(session.role);
  const admin = canAdmin(session.role);

  const [
    variants,
    lowCandidates,
    zeroCount,
    periodTxns,
    recentTxns,
    openPicks,
    openCounts,
    unreadNotifs,
    productsCount,
    locationsCount,
    categories,
    recentOutboundIds,
  ] = await Promise.all([
    prisma.productVariant.findMany({
      where: companyFilter,
      select: {
        id: true,
        quantityOnHand: true,
        quantityReserved: true,
        minAlertLevel: true,
        product: { select: { costPrice: true, sellingPrice: true } },
      },
    }),
    prisma.productVariant.findMany({
      where: companyFilter,
      include: { product: true, location: true },
      orderBy: { quantityOnHand: "asc" },
      take: 80,
    }),
    prisma.productVariant.count({
      where: { ...companyFilter, quantityOnHand: 0 },
    }),
    prisma.stockTransaction.findMany({
      where: { timestamp: { gte: from }, variant: companyFilter },
      select: {
        id: true,
        type: true,
        quantityChanged: true,
        variantId: true,
        variant: {
          select: {
            sku: true,
            product: { select: { title: true } },
          },
        },
      },
    }),
    prisma.stockTransaction.findMany({
      where: { variant: companyFilter },
      take: 12,
      orderBy: { timestamp: "desc" },
      include: { variant: { include: { product: true } } },
    }),
    prisma.pickList.findMany({
      where: {
        companyId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.stockCountSession.findMany({
      where: { companyId, status: "OPEN" },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.notification.count({
      where: { companyId, read: false },
    }),
    prisma.product.count({ where: { companyId } }),
    prisma.warehouseLocation.count({ where: { companyId } }),
    prisma.category.findMany({
      where: { companyId },
      include: {
        products: { select: { variants: { select: { quantityOnHand: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.stockTransaction.findMany({
      where: {
        type: "OUTBOUND",
        timestamp: { gte: deadSince },
        variant: companyFilter,
      },
      select: { variantId: true },
      distinct: ["variantId"],
    }),
  ]);

  const low = lowCandidates.filter(
    (v) => v.quantityOnHand <= v.minAlertLevel
  );

  const unitsOnHand = variants.reduce((s, v) => s + v.quantityOnHand, 0);
  const unitsReserved = variants.reduce((s, v) => s + v.quantityReserved, 0);
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
  const transfers = periodTxns.filter((t) => t.type === "TRANSFER").length;
  const adjustments = periodTxns.filter((t) => t.type === "ADJUSTMENT").length;

  const moveMap = new Map<
    string,
    { title: string; sku: string; out: number; inn: number }
  >();
  for (const t of periodTxns) {
    const cur = moveMap.get(t.variantId) || {
      title: t.variant.product.title,
      sku: t.variant.sku,
      out: 0,
      inn: 0,
    };
    if (t.type === "OUTBOUND") cur.out += Math.abs(t.quantityChanged);
    if (t.type === "INBOUND") cur.inn += Math.abs(t.quantityChanged);
    moveMap.set(t.variantId, cur);
  }
  const topMovers = [...moveMap.values()]
    .sort((a, b) => b.out + b.inn - (a.out + a.inn))
    .slice(0, 6);

  const activeOutbound = new Set(recentOutboundIds.map((r) => r.variantId));
  const quietStock = variants.filter(
    (v) => v.quantityOnHand > 0 && !activeOutbound.has(v.id)
  ).length;

  const byCategory = categories
    .map((c) => ({
      name: c.name,
      qty: c.products.reduce(
        (s, p) => s + p.variants.reduce((vs, v) => vs + v.quantityOnHand, 0),
        0
      ),
      skus: c.products.reduce((s, p) => s + p.variants.length, 0),
    }))
    .sort((a, b) => b.qty - a.qty);
  const maxCat = Math.max(...byCategory.map((c) => c.qty), 1);

  const periodLabel =
    period === "week" ? "השבוע" : period === "month" ? "החודש" : "היום";

  const role = session.role as Role;

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--lime)_22%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_50%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">
                {greeting()}, {session.name.split(" ")[0]}
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
                מרכז עבודה
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
                {session.companyName} ·{" "}
                {ROLE_LABELS[role] || role} · תמונת מצב חיה למחסן ולמשרד
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Suspense>
                <DashboardPeriod />
              </Suspense>
              {unreadNotifs > 0 && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                >
                  <Bell className="h-4 w-4 text-[var(--warn)]" />
                  {unreadNotifs} התראות
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="יחידות במלאי"
          value={unitsOnHand.toLocaleString("he-IL")}
          hint={`${variants.length} SKUs · ${unitsReserved} שמורים`}
          icon={Boxes}
          tone="accent"
        />
        <StatCard
          label="שווי מלאי"
          value={formatCurrency(valueCost)}
          hint={`מכירה: ${formatCurrency(valueSell)}`}
          icon={TrendingUp}
        />
        <StatCard
          label="מתחת לסף"
          value={low.length}
          hint={zeroCount ? `${zeroCount} במלאי אפס` : "בסף ההתראה"}
          icon={AlertTriangle}
          tone={low.length ? "danger" : "ok"}
        />
        <StatCard
          label={`תנועות ${periodLabel}`}
          value={
            <span className="text-xl sm:text-2xl">
              <span className="text-[var(--ok)]">+{inbound}</span>
              <span className="mx-1 text-[var(--muted)]">/</span>
              <span className="text-[var(--danger)]">−{outbound}</span>
            </span>
          }
          hint={`${transfers} העברות · ${adjustments} התאמות`}
          icon={ArrowLeftRight}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="מוצרים"
          value={productsCount}
          hint={`${locationsCount} מיקומים`}
          icon={Package}
        />
        <StatCard
          label="ליקוטים פתוחים"
          value={openPicks.length}
          tone={openPicks.length ? "warn" : "ok"}
          icon={ClipboardList}
        />
        <StatCard
          label="ספירות פתוחות"
          value={openCounts.length}
          tone={openCounts.length ? "warn" : "ok"}
          icon={Calculator}
        />
        <StatCard
          label="מלאי שקט (30י׳)"
          value={quietStock}
          hint="יש מלאי בלי יציאה לאחרונה"
          icon={TrendingDown}
          tone={quietStock ? "warn" : "default"}
        />
      </section>

      {/* Work queues + alerts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">תור עבודה</h2>
            {modules.pick && (
              <Link
                href="/picks"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                כל הליקוטים
              </Link>
            )}
          </div>
          {(modules.pick ? openPicks.length === 0 : true) &&
          openCounts.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--ok)]" />
              <p className="text-sm font-medium">אין משימות פתוחות</p>
              <p className="text-xs text-[var(--muted)]">
                אפשר להתחיל ניפוק או קליטה מהפעולות המהירות
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {modules.pick &&
                openPicks.map((p) => {
                const done = p.items.filter((i) => i.status === "DONE").length;
                const total = p.items.length || 1;
                const pct = Math.round((done / total) * 100);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/picks/${p.id}`}
                      className="block rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3.5 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                            <span className="truncate font-medium">
                              {p.reference}
                            </span>
                            <Badge
                              tone={
                                p.status === "IN_PROGRESS" ? "warn" : "neutral"
                              }
                            >
                              {p.status === "IN_PROGRESS" ? "בתהליך" : "פתוח"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {done}/{p.items.length} פריטים · עודכן{" "}
                            {formatDateTime(p.updatedAt)}
                          </p>
                        </div>
                        <span className="shrink-0 font-display text-sm font-bold tabular-nums text-[var(--accent)]">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
              {openCounts.map((c) => {
                const counted = c.lines.filter((l) => l.countedQty != null).length;
                const total = c.lines.length || 1;
                const pct = Math.round((counted / total) * 100);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/counts/${c.id}`}
                      className="block rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3.5 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 shrink-0 text-[var(--warn)]" />
                            <span className="truncate font-medium">{c.name}</span>
                            <Badge tone="warn">ספירה</Badge>
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {counted}/{c.lines.length} שורות
                            {c.zone ? ` · אזור ${c.zone}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-display text-sm font-bold tabular-nums text-[var(--warn)]">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full rounded-full bg-[var(--warn)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">התראות מלאי</h2>
            <Link
              href="/reports"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              לדוחות
            </Link>
          </div>
          {low.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--ok)]" />
              <p className="text-sm font-medium">המלאי בטווח תקין</p>
              <p className="text-xs text-[var(--muted)]">אין פריטים מתחת לסף</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {low.slice(0, 8).map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{v.product.title}</div>
                    <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
                      {v.sku}
                      {attributesLabel(v.attributes)
                        ? ` · ${attributesLabel(v.attributes)}`
                        : ""}
                      {v.location ? ` · ${v.location.code}` : ""}
                    </div>
                  </div>
                  <Badge tone={v.quantityOnHand <= 0 ? "danger" : "warn"}>
                    {v.quantityOnHand}/{v.minAlertLevel}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Category + movers — clean rankings, tidy bars */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-display text-lg font-semibold">
            מלאי לפי קטגוריה
          </h2>
          <p className="mb-5 text-xs text-[var(--muted)]">
            יחידות במלאי · ממוין מהגבוה לנמוך
          </p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">אין קטגוריות עדיין</p>
          ) : (
            <ul className="space-y-4">
              {byCategory.map((c, i) => {
                const pct = Math.max(4, Math.round((c.qty / maxCat) * 100));
                return (
                  <li key={c.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-xs text-[var(--muted)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate font-medium">{c.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">
                        <span className="font-semibold text-[var(--foreground)]">
                          {c.qty.toLocaleString("he-IL")}
                        </span>
                        <span className="mx-1">·</span>
                        {c.skus} SKU
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-[var(--accent)] to-[var(--lime)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-lg font-semibold">
            הפריטים הכי פעילים {periodLabel}
          </h2>
          <p className="mb-5 text-xs text-[var(--muted)]">
            כניסות ויציאות לפי תנועות בתקופה
          </p>
          {topMovers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Clock3 className="h-8 w-8 text-[var(--muted)]" />
              <p className="text-sm text-[var(--muted)]">
                עדיין אין תנועות ב־{periodLabel}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {topMovers.map((m, i) => (
                <li
                  key={m.sku}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] font-mono text-xs text-[var(--muted)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.title}</div>
                      <div className="truncate text-xs text-[var(--muted)]">
                        {m.sku}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-left text-xs tabular-nums">
                    <div className="text-[var(--ok)]">+{m.inn}</div>
                    <div className="text-[var(--danger)]">−{m.out}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Recent feed */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">פיד תנועות</h2>
            <p className="text-xs text-[var(--muted)]">12 האחרונות בכל המערכת</p>
          </div>
          <Link
            href="/stock"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            כל התנועות
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="bg-[var(--surface-2)] text-right text-[var(--muted)]">
                <th className="px-5 py-3 font-medium">זמן</th>
                <th className="px-3 py-3 font-medium">סוג</th>
                <th className="px-3 py-3 font-medium">מוצר</th>
                <th className="px-3 py-3 font-medium">שינוי</th>
                <th className="px-5 py-3 font-medium">סיבה</th>
              </tr>
            </thead>
            <tbody>
              {recentTxns.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-[var(--muted)]"
                  >
                    עדיין אין תנועות מלאי
                  </td>
                </tr>
              ) : (
                recentTxns.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-[var(--border)] transition hover:bg-[var(--surface-2)]/50"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-[var(--muted)]">
                      {formatDateTime(t.timestamp)}
                    </td>
                    <td className="px-3 py-3">
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
                    <td className="px-3 py-3">
                      <div className="font-medium">{t.variant.product.title}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {t.variant.sku}
                      </div>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 font-mono tabular-nums font-semibold",
                        t.quantityChanged > 0
                          ? "text-[var(--ok)]"
                          : t.quantityChanged < 0
                            ? "text-[var(--danger)]"
                            : ""
                      )}
                    >
                      {t.quantityChanged > 0
                        ? `+${t.quantityChanged}`
                        : t.quantityChanged}
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)]">{t.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick actions — bottom of page for easy reach */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">פעולות מהירות</h2>
          <span className="text-xs text-[var(--muted)]">גישה מהירה לכלים</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {operate && (
            <>
              {modules.sales && (
                <ActionTile
                  href="/pick"
                  label="ניפוק"
                  desc="הוצאה מהירה מהמלאי"
                  icon={PackageMinus}
                  tone="danger"
                />
              )}
              {modules.inbound && (
                <ActionTile
                  href="/inbound"
                  label="קליטה"
                  desc="הכנסת סחורה למדף"
                  icon={PackagePlus}
                  tone="accent"
                />
              )}
              {modules.pick && (
                <ActionTile
                  href="/picks"
                  label="ליקוט"
                  desc={`${openPicks.length} רשימות פתוחות`}
                  icon={ClipboardList}
                  tone="lime"
                />
              )}
              <ActionTile
                href="/counts"
                label="ספירה"
                desc={`${openCounts.length} ספירות פתוחות`}
                icon={Calculator}
              />
              <ActionTile
                href="/scan"
                label="סריקה"
                desc="מסופון +1 / −1"
                icon={ScanBarcode}
              />
            </>
          )}
          <ActionTile
            href="/products"
            label="קטלוג"
            desc={`${productsCount} מוצרים`}
            icon={Package}
          />
          <ActionTile
            href="/stock"
            label="תנועות"
            desc={`פעילות ${periodLabel}`}
            icon={ArrowLeftRight}
          />
          <ActionTile
            href="/reports"
            label="דוחות"
            desc="מלאי, פחת ודיוק"
            icon={BarChart3}
          />
          {admin && (
            <ActionTile
              href="/team"
              label="עובדים"
              desc="ניהול צוות והרשאות"
              icon={Users}
            />
          )}
          <ActionTile
            href="/help"
            label="מרכז עזרה"
            desc="מדריכים קצרים בתוך המערכת"
            icon={CircleHelp}
          />
        </div>
      </section>

      {role === ROLES.VIEWER && (
        <p className="text-center text-xs text-[var(--muted)]">
          מחוברים כצופים — פעולות מלאי מוגבלות להרשאתכם
        </p>
      )}
    </div>
  );
}
