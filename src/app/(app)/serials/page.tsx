import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SerialsPanel } from "@/components/serials-panel";
import { requireModule } from "@/lib/tenant";

export default async function SerialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  noStore();
  const { session } = await requireModule("serials");
  const { q, status } = await searchParams;

  const serials = await prisma.serialNumber.findMany({
    where: {
      companyId: session.companyId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { serial: { contains: q, mode: "insensitive" } },
              { variant: { sku: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      variant: { include: { product: true } },
      location: true,
      lot: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="סריאליים"
        description="מעקב מספרים סידוריים לפי סטטוס ומיקום"
      />
      <SerialsPanel serials={JSON.parse(JSON.stringify(serials))} />
    </div>
  );
}
