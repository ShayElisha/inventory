import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TransfersPanel } from "@/components/transfers-panel";
import { requireModule } from "@/lib/tenant";

export default async function TransfersPage() {
  noStore();
  const { session } = await requireModule("transfers");
  const [transfers, variants, warehouses, locations] = await Promise.all([
    prisma.stockTransfer.findMany({
      where: { companyId: session.companyId },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        lines: {
          include: {
            variant: { include: { product: true } },
            fromLocation: true,
            toLocation: true,
          },
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
    prisma.warehouse.findMany({
      where: { companyId: session.companyId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="העברות בין מחסנים"
        description="טיוטה → שליחה (יציאה) → קבלה במחסן יעד"
      />
      <TransfersPanel
        transfers={JSON.parse(JSON.stringify(transfers))}
        variants={JSON.parse(JSON.stringify(variants))}
        warehouses={JSON.parse(JSON.stringify(warehouses))}
        locations={JSON.parse(JSON.stringify(locations))}
      />
    </div>
  );
}
