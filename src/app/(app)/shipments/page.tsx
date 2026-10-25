import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ShipmentsPanel } from "@/components/shipments-panel";
import { requireModule } from "@/lib/tenant";

export default async function ShipmentsPage() {
  noStore();
  const { session } = await requireModule("shipments");
  const [shipments, salesOrders] = await Promise.all([
    prisma.shipment.findMany({
      where: { companyId: session.companyId },
      include: {
        salesOrder: {
          select: { id: true, number: true, customerName: true },
        },
        packages: {
          include: {
            items: { include: { variant: { include: { product: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salesOrder.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["OPEN", "PARTIAL", "FULFILLED", "PACKED"] },
      },
      select: { id: true, number: true, customerName: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="משלוחים ואריזה"
        description="חבילות, מוביל ומספר מעקב מול הזמנת לקוח"
      />
      <ShipmentsPanel
        shipments={JSON.parse(JSON.stringify(shipments))}
        salesOrders={JSON.parse(JSON.stringify(salesOrders))}
      />
    </div>
  );
}
