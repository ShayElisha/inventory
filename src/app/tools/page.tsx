import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { BulkAndImport } from "@/components/bulk-and-import";

export default async function ToolsPage() {
  noStore();
  const variants = await prisma.productVariant.findMany({
    include: { product: true },
    orderBy: { sku: "asc" },
    take: 500,
  });

  return (
    <div>
      <PageHeader
        title="ייבוא ועדכון כמותי"
        description="ייבוא CSV ועדכון כמויות בכמות (bulk)"
      />
      <BulkAndImport variants={JSON.parse(JSON.stringify(variants))} />
    </div>
  );
}
