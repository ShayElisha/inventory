import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { QuickPick } from "@/components/quick-pick";
import { OutboundTemplatesPanel } from "@/components/outbound-templates-panel";
import { requireModule } from "@/lib/tenant";

export default async function PickPage() {
  noStore();
  const { session } = await requireModule("sales");
  const [templates, variants] = await Promise.all([
    prisma.outboundTemplate.findMany({
      where: { companyId: session.companyId, active: true },
      include: {
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { product: { companyId: session.companyId } },
      include: { product: true },
      orderBy: { sku: "asc" },
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניפוק"
        description="ניפוק מהיר לפי חיפוש, או הרצת תבנית ניפוק חוזרת בלחיצה"
      />
      <OutboundTemplatesPanel
        templates={JSON.parse(JSON.stringify(templates))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
      <QuickPick />
    </div>
  );
}
