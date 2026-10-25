import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ReorderPanel } from "@/components/reorder-panel";
import { requireModule } from "@/lib/tenant";

export default async function ReorderPage() {
  noStore();
  const { session } = await requireModule("reorder");
  const [rules, variants, suppliers] = await Promise.all([
    prisma.reorderRule.findMany({
      where: { companyId: session.companyId },
      include: {
        variant: { include: { product: true } },
        supplier: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
    prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  const suggestions = rules
    .filter((r) => r.active && r.variant.quantityOnHand <= r.minQty)
    .map((r) => {
      const target = r.maxQty ?? r.minQty + r.reorderQty;
      const qty = Math.max(r.reorderQty, target - r.variant.quantityOnHand);
      return {
        ruleId: r.id,
        variantId: r.variantId,
        sku: r.variant.sku,
        title: r.variant.product.title,
        onHand: r.variant.quantityOnHand,
        minQty: r.minQty,
        suggestQty: qty,
        supplierId: r.supplierId,
        supplierName: r.supplier?.name || null,
      };
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="הזמנות חוזרות"
        description="כללי מינימום · הצעות רכש · יצירת PO"
      />
      <ReorderPanel
        rules={JSON.parse(JSON.stringify(rules))}
        suggestions={JSON.parse(JSON.stringify(suggestions))}
        variants={JSON.parse(JSON.stringify(variants))}
        suppliers={JSON.parse(JSON.stringify(suppliers))}
      />
    </div>
  );
}
