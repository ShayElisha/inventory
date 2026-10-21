import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { StockOperations } from "@/components/stock-operations";


export default async function StockPage() {
  noStore();
  const [variants, locations] = await Promise.all([
    prisma.productVariant.findMany({
      include: { product: true, location: true },
      orderBy: { sku: "asc" },
    }),
    prisma.warehouseLocation.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="תנועות מלאי"
        description="קליטה, ניפוק, העברה וספירת מלאי"
      />
      <StockOperations variants={variants} locations={locations} />
    </div>
  );
}
