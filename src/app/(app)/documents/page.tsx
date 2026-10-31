import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DocumentsPanel } from "@/components/documents-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";

export default async function DocumentsPage() {
  noStore();
  const { session } = await requireModule("sales");
  const documents = await prisma.stockDocument.findMany({
    where: { companyId: session.companyId },
    include: {
      salesOrder: {
        select: { id: true, number: true, customerName: true },
      },
      purchaseOrder: { select: { id: true, number: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="חשבוניות ותעודות משלוח"
        description="כל המסמכים שנוצרו מהזמנות לקוח — צפייה והדפסה"
        tabs={<SectionTabs section="fulfillment" />}
      />
      <DocumentsPanel documents={JSON.parse(JSON.stringify(documents))} />
    </div>
  );
}
