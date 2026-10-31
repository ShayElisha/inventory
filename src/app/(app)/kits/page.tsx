import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { KitsPanel } from "@/components/kits-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";

export default async function KitsPage() {
  noStore();
  const { session } = await requireModule("kits");
  const [kits, variants] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: session.companyId, isKit: true },
      include: {
        kitComponents: {
          include: {
            componentVariant: { include: { product: true } },
          },
        },
        variants: true,
      },
      orderBy: { title: "asc" },
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
        title="קיטים והרכבה"
        description="הרכבה מורידה רכיבים ומעלה קיט · פירוק הפוך"
        tabs={<SectionTabs section="inventory" />}
      />
      <KitsPanel
        kits={JSON.parse(JSON.stringify(kits))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}
