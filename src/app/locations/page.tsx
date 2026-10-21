import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { LocationsManager } from "@/components/locations-manager";


export default async function LocationsPage() {
  noStore();
  const locations = await prisma.warehouseLocation.findMany({
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
