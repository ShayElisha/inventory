import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { LotsPanel } from "@/components/lots-panel";
import { requireModule } from "@/lib/tenant";

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ expiring?: string }>;
}) {
  noStore();
  const { session } = await requireModule("lots");
  const { expiring } = await searchParams;
  const until = new Date();
  until.setDate(until.getDate() + 30);

  const lots = await prisma.inventoryLot.findMany({
    where: {
      companyId: session.companyId,
      quantity: { gt: 0 },
      ...(expiring === "1"
        ? { expiryDate: { not: null, lte: until } }
        : {}),
    },
    include: {
      variant: { include: { product: true } },
      location: true,
    },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="אצוות ותוקף"
        description="מעקב תוקף ואצוות · ניפוק לפי תוקף קרוב קודם · התראות ל־30 יום"
        actions={
          <a
            href={expiring === "1" ? "/lots" : "/lots?expiring=1"}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm hover:bg-[var(--surface-2)]"
          >
            {expiring === "1" ? "כל האצוות" : "פגות תוקף בקרוב (30 יום)"}
          </a>
        }
      />
      <LotsPanel lots={JSON.parse(JSON.stringify(lots))} />
    </div>
  );
}
