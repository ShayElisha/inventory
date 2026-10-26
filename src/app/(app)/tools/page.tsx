import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { BulkAndImport } from "@/components/bulk-and-import";
import { requireTenant } from "@/lib/tenant";

export default async function ToolsPage() {
  noStore();
  const session = await requireTenant();
  const variants = await prisma.productVariant.findMany({
    where: { product: { companyId: session.companyId } },
    include: { product: true },
    orderBy: { sku: "asc" },
    take: 500,
  });

  return (
    <div>
      <PageHeader
        title="ייבוא ועדכון כמותי"
        description="ייבוא מוצרים מאקסל/CSV (עם קטגוריות) ועדכון כמויות בכמות"
      />
      <BulkAndImport variants={JSON.parse(JSON.stringify(variants))} />
    </div>
  );
}
