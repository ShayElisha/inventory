import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PriceListsPanel } from "@/components/price-lists-panel";
import { requireModule } from "@/lib/tenant";

export default async function PriceListsPage() {
  noStore();
  const { session } = await requireModule("commerce");
  const [priceLists, variants] = await Promise.all([
    prisma.priceList.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: { select: { items: true, customers: true } },
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
        title="מחירונים"
        description="מחירי מכירה לפי לקוח / כמות — מעל מודול המכירה"
      />
      <PriceListsPanel
        priceLists={JSON.parse(JSON.stringify(priceLists))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}
