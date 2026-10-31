import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { PickListDetail } from "@/components/pick-list-detail";
import { requireModule } from "@/lib/tenant";

export default async function PickDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { session } = await requireModule("pick");
  const { id } = await params;
  const [list, variants] = await Promise.all([
    prisma.pickList.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        items: {
          include: { variant: { include: { product: true, location: true } } },
        },
        salesOrder: { select: { id: true, number: true, customerName: true } },
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

  const variantIds = list.items.map((i) => i.variantId);
  const [lots, serials] = await Promise.all([
    variantIds.length
      ? prisma.inventoryLot.findMany({
          where: {
            companyId: session.companyId,
            variantId: { in: variantIds },
            quantity: { gt: 0 },
          },
          orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    variantIds.length
      ? prisma.serialNumber.findMany({
          where: {
            companyId: session.companyId,
            variantId: { in: variantIds },
            status: "IN_STOCK",
          },
          orderBy: { serial: "asc" },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

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
        }${
          list.salesOrder ? ` · הזמנה ${list.salesOrder.number}` : ""
        } · אפשר להוסיף או להסיר פריטים תוך כדי`}
      />
      <PickListDetail
        list={JSON.parse(JSON.stringify(list))}
        variants={JSON.parse(JSON.stringify(variants))}
        lots={JSON.parse(JSON.stringify(lots))}
        serials={JSON.parse(JSON.stringify(serials))}
      />
    </div>
  );
}
