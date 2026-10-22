import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { CountDetail } from "@/components/count-detail";

export default async function CountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;
  const session = await prisma.stockCountSession.findUnique({
    where: { id },
    include: {
      lines: {
        include: { variant: { include: { product: true, location: true } } },
        orderBy: { variant: { sku: "asc" } },
      },
    },
  });
  if (!session) notFound();

  return (
    <div>
      <PageHeader
        title={session.name}
        description={`השוואת ספירה מול מערכת · ${session.status}`}
      />
      <CountDetail session={JSON.parse(JSON.stringify(session))} />
    </div>
  );
}
