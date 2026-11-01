import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SalesOrdersPanel } from "@/components/sales-orders-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireTenant } from "@/lib/tenant";

export default async function OrdersPage() {
  noStore();
  const session = await requireTenant();
  const [orders, variants, customers] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["OPEN", "PARTIAL", "FULFILLED", "PACKED", "SHIPPED"] },
      },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
        customer: { select: { id: true, name: true, creditLimit: true } },
      },
      orderBy: [{ priority: "asc" }, { slaDueAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
    prisma.customer.findMany({
      where: { companyId: session.companyId, active: true },
      select: { id: true, name: true, phone: true, creditLimit: true },
      orderBy: { name: "asc" },
      take: 300,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="הזמנות לקוח"
        description="תור ניפוק לפי עדיפות ו־SLA · אכיפת אשראי · מסמכים ושליחויות"
        tabs={<SectionTabs section="sales" />}
      />
      <SalesOrdersPanel
        orders={JSON.parse(JSON.stringify(orders))}
        variants={JSON.parse(JSON.stringify(variants))}
        customers={JSON.parse(JSON.stringify(customers))}
      />
    </div>
  );
}
