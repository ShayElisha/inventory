import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { PickListCreate } from "@/components/pick-list-create";
import { requireTenant } from "@/lib/tenant";

export default async function PicksPage() {
  noStore();
  const session = await requireTenant();
  const [lists, variants] = await Promise.all([
    prisma.pickList.findMany({
      where: { companyId: session.companyId },
      include: {
        items: true,
        createdBy: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
  ]);

  const statusTone = (s: string) =>
    s === "DONE" ? "ok" : s === "CANCELLED" ? "danger" : s === "IN_PROGRESS" ? "warn" : "neutral";

  return (
    <div className="space-y-6">
      <PageHeader
        title="רשימות ליקוט"
        description="הזמנות ליקוט עם סטטוס וביצוע מהיר"
      />
      <PickListCreate variants={variants} />
      <div className="space-y-2">
        {lists.length === 0 && (
          <Card>
            <p className="text-sm text-[var(--muted)]">אין רשימות ליקוט עדיין</p>
          </Card>
        )}
        {lists.map((l) => (
          <Link key={l.id} href={`/picks/${l.id}`}>
            <Card className="mb-2 flex items-center justify-between hover:bg-[var(--surface-2)]">
              <div>
                <div className="font-semibold">{l.reference}</div>
                <div className="text-xs text-[var(--muted)]">
                  {l._count.items} פריטים · {formatDateTime(l.createdAt)}
                  {l.createdBy ? ` · ${l.createdBy.name}` : ""}
                </div>
              </div>
              <Badge tone={statusTone(l.status) as "ok" | "danger" | "warn" | "neutral"}>
                {l.status}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
