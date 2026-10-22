import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Building2, Package, Users, AlertTriangle } from "lucide-react";

export default async function AdminHomePage() {
  noStore();
  await requireSuperAdmin();

  const [
    companies,
    activeCompanies,
    pendingCompanies,
    users,
    products,
    variants,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count({ where: { slug: { not: "platform" } } }),
    prisma.company.count({
      where: { slug: { not: "platform" }, approved: true, active: true },
    }),
    prisma.company.count({
      where: { slug: { not: "platform" }, approved: false },
    }),
    prisma.user.count({ where: { role: { not: ROLES.SUPER_ADMIN } } }),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.company.findMany({
      where: { slug: { not: "platform" } },
      orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
      take: 8,
      include: { _count: { select: { users: true, products: true } } },
    }),
  ]);

  const stats = [
    {
      label: "חברות",
      value: companies,
      hint: `${activeCompanies} פעילות`,
      icon: Building2,
      href: "/admin/companies",
    },
    {
      label: "משתמשים",
      value: users,
      hint: "בכל החברות",
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "מוצרים",
      value: products,
      hint: `${variants} אפשרויות מוצר`,
      icon: Package,
      href: "/admin/companies",
    },
    {
      label: "ממתינות לאישור",
      value: pendingCompanies,
      hint: "דורשות אישור סופר־אדמין",
      icon: AlertTriangle,
      href: "/admin/companies",
    },
  ];

  return (
    <div>
      <PageHeader
        title="לוח בקרה — Sfira"
        description="ניהול חברות, משתמשים וסטטוס הפלטפורמה"
        actions={
          <Link
            href="/admin/companies"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            חברה חדשה
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition hover:border-[var(--accent)] hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[var(--muted)]">{s.label}</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--foreground)]">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{s.hint}</p>
                  </div>
                  <span className="rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">חברות אחרונות</h2>
          <Link href="/admin/companies" className="text-sm text-[var(--accent)]">
            הכל ←
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-right text-[var(--muted)]">
                <th className="pb-2 font-medium">שם</th>
                <th className="pb-2 font-medium">סטטוס</th>
                <th className="pb-2 font-medium">משתמשים</th>
                <th className="pb-2 font-medium">מוצרים</th>
                <th className="pb-2 font-medium">נוצר</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)]">
                  <td className="py-2.5">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">{c.slug}</div>
                  </td>
                  <td className="py-2.5">
                    <Badge
                      tone={
                        !c.approved ? "warn" : c.active ? "ok" : "danger"
                      }
                    >
                      {!c.approved
                        ? "ממתינה לאישור"
                        : c.active
                          ? "פעילה"
                          : "מושעית"}
                    </Badge>
                  </td>
                  <td className="py-2.5">{c._count.users}</td>
                  <td className="py-2.5">{c._count.products}</td>
                  <td className="py-2.5 text-[var(--muted)]">
                    {formatDateTime(c.createdAt)}
                  </td>
                </tr>
              ))}
              {recentCompanies.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                    אין חברות עדיין
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
