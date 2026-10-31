import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PurchaseOrdersPanel } from "@/components/purchase-orders-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";

export default async function PurchasesPage() {
  noStore();
  const { session } = await requireModule("inbound");
  const [orders, variants, locations, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { companyId: session.companyId },
      include: {
        supplier: true,
        lines: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="הזמנות רכש"
        description="הזמנות רכש, קליטה חלקית, חשבונית ספק, אצוות ותוקף"
        tabs={<SectionTabs section="purchase" />}
      />
      <PurchaseOrdersPanel
        orders={JSON.parse(JSON.stringify(orders))}
        variants={JSON.parse(JSON.stringify(variants))}
        locations={JSON.parse(JSON.stringify(locations))}
        suppliers={JSON.parse(JSON.stringify(suppliers))}
      />
    </div>
  );
}
