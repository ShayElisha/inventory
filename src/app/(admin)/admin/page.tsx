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
    users,
    products,
    variants,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count({ where: { slug: { not: "platform" } } }),
    prisma.company.count({
      where: { slug: { not: "platform" }, active: true },
    }),
    prisma.user.count({ where: { role: { not: ROLES.SUPER_ADMIN } } }),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.company.findMany({
      where: { slug: { not: "platform" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { users: true, products: true } } },
    }),
  ]);

  const suspended = companies - activeCompanies;

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
      hint: `${variants} וריאציות`,
      icon: Package,
      href: "/admin/companies",
    },
    {
      label: "מושעות",
      value: suspended,
      hint: "חברות לא פעילות",
      icon: AlertTriangle,
      href: "/admin/companies",
    },
  ];

  return (
    <div>
      <PageHeader
        title="לוח בקרה — סופר אדמין"
        description="ניהול חברות, משתמשים וסטטוס הפלטפורמה"
        actions={
          <Link
            href="/admin/companies"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
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
              <Card className="transition hover:border-teal-300 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{s.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{s.hint}</p>
                  </div>
                  <span className="rounded-lg bg-teal-50 p-2 text-teal-700">
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
          <Link href="/admin/companies" className="text-sm text-teal-700">
            הכל ←
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-right text-slate-500">
                <th className="pb-2 font-medium">שם</th>
                <th className="pb-2 font-medium">סטטוס</th>
                <th className="pb-2 font-medium">משתמשים</th>
                <th className="pb-2 font-medium">מוצרים</th>
                <th className="pb-2 font-medium">נוצר</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map((c) => (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="py-2.5">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="font-medium text-teal-800 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-400">{c.slug}</div>
                  </td>
                  <td className="py-2.5">
                    <Badge tone={c.active ? "ok" : "danger"}>
                      {c.active ? "פעילה" : "מושעית"}
                    </Badge>
                  </td>
                  <td className="py-2.5">{c._count.users}</td>
                  <td className="py-2.5">{c._count.products}</td>
                  <td className="py-2.5 text-slate-500">
                    {formatDateTime(c.createdAt)}
                  </td>
                </tr>
              ))}
              {recentCompanies.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
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
