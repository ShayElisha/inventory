import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { CountCreate } from "@/components/count-create";
import { SectionTabs } from "@/components/section-tabs";
import { requireTenant } from "@/lib/tenant";

export default async function CountsPage() {
  noStore();
  const session = await requireTenant();
  const [sessions, locations] = await Promise.all([
    prisma.stockCountSession.findMany({
      where: { companyId: session.companyId },
      include: { _count: { select: { lines: true } }, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
    }),
  ]);
  const zones = [...new Set(locations.map((l) => l.zone))];
  const shelves = [...new Set(locations.map((l) => l.shelf))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ספירת מלאי"
        description="ספירה לפי אזור / מדף, השוואה למערכת ותיקון"
        tabs={<SectionTabs section="inventory" />}
      />
      <CountCreate zones={zones} shelves={shelves} />
      <div className="space-y-2">
        {sessions.map((s) => (
          <Link key={s.id} href={`/counts/${s.id}`}>
            <Card className="mb-2 flex items-center justify-between hover:bg-[var(--surface-2)]">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {s.zone ? `אזור ${s.zone}` : "כל האזורים"}
                  {s.shelf ? ` · מדף ${s.shelf}` : ""} · {s._count.lines} פריטים ·{" "}
                  {formatDateTime(s.createdAt)}
                </div>
              </div>
              <Badge tone={s.status === "CLOSED" ? "ok" : "warn"}>{s.status}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
