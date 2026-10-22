import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SalesOrdersPanel } from "@/components/sales-orders-panel";
import { requireModule } from "@/lib/tenant";

export default async function OrdersPage() {
  noStore();
  const { session } = await requireModule("sales");
  const [orders, variants] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["OPEN", "PARTIAL", "FULFILLED", "PACKED", "SHIPPED"] },
      },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
      },
      orderBy: [{ priority: "asc" }, { slaDueAt: "asc" }, { createdAt: "desc" }],
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
        title="הזמנות לקוח"
        description="תור ניפוק לפי עדיפות ו־SLA · ניפוק חלקי · מסמכים ושליחויות"
      />
      <SalesOrdersPanel
        orders={JSON.parse(JSON.stringify(orders))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}
