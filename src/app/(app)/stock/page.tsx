import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StockOperations } from "@/components/stock-operations";
import { SectionTabs } from "@/components/section-tabs";
import { requireTenant } from "@/lib/tenant";

export default async function StockPage() {
  noStore();
  const session = await requireTenant();
  const [variants, locations] = await Promise.all([
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true, location: true },
      orderBy: { sku: "asc" },
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="תנועות מלאי"
        description="קליטה, ניפוק, העברה וספירת מלאי"
        tabs={<SectionTabs section="inventory" />}
      />
      <StockOperations variants={variants} locations={locations} />
    </div>
  );
}
