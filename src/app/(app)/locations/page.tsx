import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { LocationsManager } from "@/components/locations-manager";
import { SectionTabs } from "@/components/section-tabs";
import { requireTenant } from "@/lib/tenant";
import { ensureDefaultWarehouse } from "@/lib/warehouses";

export default async function LocationsPage() {
  noStore();
  const session = await requireTenant();
  await ensureDefaultWarehouse(session.companyId);

  const [warehouses, locations] = await Promise.all([
    prisma.warehouse.findMany({
      where: { companyId: session.companyId },
      include: { _count: { select: { locations: true } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      include: {
        _count: { select: { variants: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="מחסנים ומיקומים"
        description="ניהול מחסנים · אזור · מעבר · מדף · תא"
        tabs={<SectionTabs section="inventory" />}
      />
      <LocationsManager
        locations={JSON.parse(JSON.stringify(locations))}
        warehouses={JSON.parse(JSON.stringify(warehouses))}
      />
    </div>
  );
}
