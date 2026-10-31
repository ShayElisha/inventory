import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { DocumentView } from "@/components/document-view";
import { DocumentPrintButton } from "@/components/document-print-button";
import { requireTenant } from "@/lib/tenant";
import { documentTypeLabel } from "@/lib/documents";

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  noStore();
  const session = await requireTenant();
  const { id } = await params;
  const { print } = await searchParams;

  const doc = await prisma.stockDocument.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      salesOrder: {
        select: {
          id: true,
          number: true,
          customerName: true,
          shippingCarrier: true,
          shippingRef: true,
        },
      },
      purchaseOrder: { select: { id: true, number: true } },
    },
  });
  if (!doc) notFound();

  const autoPrint = print === "1";

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={`${documentTypeLabel(doc.type)} ${doc.number}`}
          description="צפייה והדפסה"
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/documents"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
              >
                חזרה לרשימה
              </Link>
              {doc.salesOrder?.id && (
                <Link
                  href="/orders"
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
                >
                  להזמנות
                </Link>
              )}
              <DocumentPrintButton autoPrint={autoPrint} />
            </div>
          }
        />
      </div>

      <DocumentView
        doc={JSON.parse(JSON.stringify(doc))}
        companyName={session.companyName || "Sfira"}
      />
    </div>
  );
}
