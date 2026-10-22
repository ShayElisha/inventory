import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { AdminCompanies } from "@/components/admin-companies";

export default async function AdminCompaniesPage() {
  noStore();
  await requireSuperAdmin();

  const companies = await prisma.company.findMany({
    where: { slug: { not: "platform" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          products: true,
          locations: true,
          categories: true,
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="ניהול חברות"
        description="יצירה, השעיה ומחיקה של ארגונים בפלטפורמה"
      />
      <AdminCompanies
        companies={JSON.parse(JSON.stringify(companies))}
      />
    </div>
  );
}
