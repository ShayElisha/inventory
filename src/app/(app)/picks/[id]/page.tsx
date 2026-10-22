import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PickListDetail } from "@/components/pick-list-detail";
import { requireTenant } from "@/lib/tenant";

export default async function PickDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const session = await requireTenant();
  const { id } = await params;
  const list = await prisma.pickList.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      items: {
        include: { variant: { include: { product: true, location: true } } },
      },
      createdBy: true,
    },
  });
  if (!list) notFound();

  return (
    <div>
      <PageHeader title={`ליקוט: ${list.reference}`} description={`סטטוס: ${list.status}`} />
      <PickListDetail list={JSON.parse(JSON.stringify(list))} />
    </div>
  );
}
