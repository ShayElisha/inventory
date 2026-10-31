import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { WaitlistPanel } from "@/components/waitlist-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";

export default async function WaitlistPage() {
  noStore();
  const { session } = await requireModule("commerce");
  const items = await prisma.waitlistItem.findMany({
    where: { companyId: session.companyId },
    include: {
      variant: { include: { product: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="רשימת המתנה"
        description="לקוחות שממתינים לפריטים שחסרים במלאי"
        tabs={<SectionTabs section="sales" />}
      />
      <WaitlistPanel items={JSON.parse(JSON.stringify(items))} />
    </div>
  );
}
