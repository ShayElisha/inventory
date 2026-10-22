import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SetupPanel } from "@/components/setup-panel";
import { requireTenant } from "@/lib/tenant";

export default async function SetupPage() {
  noStore();
  const session = await requireTenant();
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="הגדרות בסיס"
        description="קטגוריות וספקים — לפני הוספת מוצרים ומלאי"
      />
      <SetupPanel categories={categories} suppliers={suppliers} />
    </div>
  );
}
