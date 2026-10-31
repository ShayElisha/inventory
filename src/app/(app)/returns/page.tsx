import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ReturnsPanel } from "@/components/returns-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";

export default async function ReturnsPage() {
  noStore();
  const { session } = await requireModule("returns");
  const [returns, variants, customers, salesOrders] = await Promise.all([
    prisma.returnAuthorization.findMany({
      where: { companyId: session.companyId },
      include: {
        customer: { select: { id: true, name: true } },
        salesOrder: { select: { id: true, number: true } },
        lines: {
          include: { variant: { include: { product: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
    prisma.customer.findMany({
      where: { companyId: session.companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.salesOrder.findMany({
      where: {
        companyId: session.companyId,
        status: { not: "CANCELLED" },
      },
      select: { id: true, number: true, customerName: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="החזרות (RMA)"
        description="החזרת לקוח · קבלה למלאי · זיכוי ומסמך CREDIT_NOTE"
        tabs={<SectionTabs section="sales" />}
      />
      <ReturnsPanel
        returns={JSON.parse(JSON.stringify(returns))}
        variants={JSON.parse(JSON.stringify(variants))}
        customers={JSON.parse(JSON.stringify(customers))}
        salesOrders={JSON.parse(JSON.stringify(salesOrders))}
      />
    </div>
  );
}
