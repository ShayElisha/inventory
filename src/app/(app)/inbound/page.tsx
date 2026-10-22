import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { QuickInbound } from "@/components/quick-inbound";
import { requireTenant } from "@/lib/tenant";

export default async function InboundPage() {
  noStore();
  const session = await requireTenant();
  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId: session.companyId },
    orderBy: { code: "asc" },
  });
  return (
    <div>
      <PageHeader
        title="קליטה מהירה"
        description="חיפוש לפי שם / מק״ט / ברקוד → כמות → אישור"
      />
      <QuickInbound locations={locations} />
    </div>
  );
}
