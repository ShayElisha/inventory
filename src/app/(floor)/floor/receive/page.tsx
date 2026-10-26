import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { requireModule } from "@/lib/tenant";
import { FloorReceive } from "@/components/floor-flow";

export default async function FloorReceivePage() {
  noStore();
  const { session } = await requireModule("inbound");
  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId: session.companyId },
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  return <FloorReceive locations={locations} />;
}
