import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { CustomersPanel } from "@/components/customers-panel";
import { requireModule } from "@/lib/tenant";

export default async function CustomersPage() {
  noStore();
  const { session } = await requireModule("commerce");
  const [customers, priceLists] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: session.companyId },
      include: {
        priceList: { select: { id: true, name: true } },
        _count: { select: { salesOrders: true, waitlistItems: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.priceList.findMany({
      where: { companyId: session.companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="לקוחות"
        description="כרטיסי לקוח, מסגרת אשראי ומחירון משויך"
      />
      <CustomersPanel
        customers={JSON.parse(JSON.stringify(customers))}
        priceLists={JSON.parse(JSON.stringify(priceLists))}
      />
    </div>
  );
}
