import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PickWorkspace } from "@/components/pick-workspace";
import { SectionTabs } from "@/components/section-tabs";
import { requireTenant } from "@/lib/tenant";

export default async function OutboundPage() {
  noStore();
  const session = await requireTenant();
  const [templates, variants] = await Promise.all([
    prisma.outboundTemplate.findMany({
      where: { companyId: session.companyId, active: true },
      include: {
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניפוק"
        description="ניפוק מרוכז לרשימה · ניפוק מהיר לפריט בודד · תבניות חוזרות בלחיצה"
        tabs={<SectionTabs section="fulfillment" />}
      />
      <PickWorkspace
        templates={JSON.parse(JSON.stringify(templates))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}
