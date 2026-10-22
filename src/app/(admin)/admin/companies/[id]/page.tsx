import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { AdminCompanyDetail } from "@/components/admin-company-detail";

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  await requireSuperAdmin();
  const { id } = await params;

  const company = await prisma.company.findFirst({
    where: { id, slug: { not: "platform" } },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          products: true,
          locations: true,
          categories: true,
          suppliers: true,
          pickLists: true,
          stockCounts: true,
        },
      },
    },
  });

  if (!company) notFound();

  return (
    <div>
      <PageHeader
        title={company.name}
        description={`ניהול חברה · ${company.slug}`}
        actions={
          <Link
            href="/admin/companies"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            חזרה לרשימה
          </Link>
        }
      />
      <AdminCompanyDetail company={JSON.parse(JSON.stringify(company))} />
    </div>
  );
}
