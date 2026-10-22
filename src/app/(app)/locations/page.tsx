import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { LocationsManager } from "@/components/locations-manager";
import { requireTenant } from "@/lib/tenant";

export default async function LocationsPage() {
  noStore();
  const session = await requireTenant();
  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId: session.companyId },
    include: { _count: { select: { variants: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="מיקומי מחסן"
        description="אזור · מעבר · מדף · תא — קוד לסריקה במסופון"
      />
      <LocationsManager locations={locations} />
    </div>
  );
}
