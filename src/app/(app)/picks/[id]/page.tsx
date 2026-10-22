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
  const [list, variants] = await Promise.all([
    prisma.pickList.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        items: {
          include: { variant: { include: { product: true, location: true } } },
        },
        createdBy: true,
        template: { select: { name: true } },
      },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
  ]);
  if (!list) notFound();

  const statusLabel: Record<string, string> = {
    OPEN: "פתוח",
    IN_PROGRESS: "בתהליך",
    DONE: "הושלם",
    CANCELLED: "בוטל",
  };

  return (
    <div>
      <PageHeader
        title={`ליקוט: ${list.reference}`}
        description={`${statusLabel[list.status] || list.status}${
          list.template ? ` · מתבנית «${list.template.name}»` : ""
        } · אפשר להוסיף או להסיר פריטים תוך כדי`}
      />
      <PickListDetail
        list={JSON.parse(JSON.stringify(list))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}
