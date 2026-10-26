import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SetupPanel } from "@/components/setup-panel";
import { CustomFieldsPanel } from "@/components/custom-fields-panel";
import { requireTenant } from "@/lib/tenant";
import { canAdmin } from "@/lib/auth";

export default async function SetupPage() {
  noStore();
  const session = await requireTenant();
  const [categories, suppliers, customFields] = await Promise.all([
    prisma.category.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.customField.findMany({
      where: {
        companyId: session.companyId,
        entityType: "PRODUCT",
        active: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="הגדרות בסיס"
        description="קטגוריות, ספקים ושדות מותאמים למוצרים"
      />
      <SetupPanel categories={categories} suppliers={suppliers} />
      <CustomFieldsPanel
        fields={JSON.parse(JSON.stringify(customFields))}
        canManage={canAdmin(session.role)}
      />
    </div>
  );
}
