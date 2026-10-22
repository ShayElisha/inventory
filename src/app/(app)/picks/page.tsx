import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { PickListCreate } from "@/components/pick-list-create";
import { PickTemplatesPanel } from "@/components/pick-templates-panel";
import { requireTenant } from "@/lib/tenant";

export default async function PicksPage() {
  noStore();
  const session = await requireTenant();
  const [lists, variants, templates] = await Promise.all([
    prisma.pickList.findMany({
      where: { companyId: session.companyId },
      include: {
        items: true,
        createdBy: true,
        template: { select: { id: true, name: true } },
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
    prisma.pickTemplate.findMany({
      where: { companyId: session.companyId, active: true },
      include: {
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const statusLabel: Record<string, string> = {
    OPEN: "פתוח",
    IN_PROGRESS: "בתהליך",
    DONE: "הושלם",
    CANCELLED: "בוטל",
  };

  const statusTone = (s: string) =>
    s === "DONE"
      ? "ok"
      : s === "CANCELLED"
        ? "danger"
        : s === "IN_PROGRESS"
          ? "warn"
          : "neutral";

  const activeLists = lists.filter(
    (l) => l.status === "OPEN" || l.status === "IN_PROGRESS"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="רשימות ליקוט"
        description="תבניות קבועות, ליקוט מקבילי, והוספה/הסרה של פריטים תוך כדי ביצוע"
      />

      <PickTemplatesPanel
        templates={JSON.parse(JSON.stringify(templates))}
        variants={JSON.parse(JSON.stringify(variants))}
      />

      {activeLists.length > 1 && (
        <Card className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/30">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {activeLists.length} ליקוטים פעילים במקביל
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeLists.map((l) => (
              <Link
                key={l.id}
                href={`/picks/${l.id}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]"
              >
                {l.reference}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <PickListCreate variants={variants} />

      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold">כל הרשימות</h2>
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
                  {l.template ? ` · תבנית: ${l.template.name}` : ""}
                </div>
              </div>
              <Badge
                tone={statusTone(l.status) as "ok" | "danger" | "warn" | "neutral"}
              >
                {statusLabel[l.status] || l.status}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
