import { unstable_noStore as noStore } from "next/cache";
import { ensureSchemaPatches, prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DocumentsPanel } from "@/components/documents-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireTenant } from "@/lib/tenant";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  noStore();
  await ensureSchemaPatches();
  const session = await requireTenant();
  const { payment } = await searchParams;
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
        description="מסמכים, גבייה וצרופות"
        tabs={<SectionTabs section="fulfillment" />}
      />
      <DocumentsPanel
        documents={JSON.parse(JSON.stringify(documents))}
        initialPaymentFilter={payment === "open" ? "open" : ""}
      />
    </div>
  );
}
