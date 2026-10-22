import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { InboundWorkspace } from "@/components/inbound-workspace";
import { requireModule } from "@/lib/tenant";

export default async function InboundPage() {
  noStore();
  const { session } = await requireModule("inbound");

  const [variants, locations, suppliers, orders, recent] = await Promise.all([
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: {
        product: {
          select: {
            title: true,
            trackLots: true,
            trackSerials: true,
          },
        },
      },
      orderBy: { sku: "asc" },
      take: 800,
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { companyId: session.companyId },
      include: {
        supplier: true,
        lines: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.stockTransaction.findMany({
      where: {
        type: "INBOUND",
        variant: { product: { companyId: session.companyId } },
      },
      include: {
        variant: { include: { product: { select: { title: true } } } },
      },
      orderBy: { timestamp: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="קליטה"
        description="קליטה מרובת שורות, מול הזמנת רכש, קליטה מהירה והיסטוריה — עם חשבונית, מיקומים, אצוות ותוקף"
      />
      <InboundWorkspace
        variants={JSON.parse(JSON.stringify(variants))}
        locations={JSON.parse(JSON.stringify(locations))}
        suppliers={JSON.parse(JSON.stringify(suppliers))}
        orders={JSON.parse(JSON.stringify(orders))}
        recent={JSON.parse(JSON.stringify(recent))}
      />
    </div>
  );
}
