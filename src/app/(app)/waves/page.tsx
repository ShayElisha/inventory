import { unstable_noStore as noStore } from "next/cache";
import { PageHeader } from "@/components/ui";
import { WavesPanel } from "@/components/waves-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";
import { ensureSchemaPatches } from "@/lib/db";

export default async function WavesPage() {
  noStore();
  await requireModule("pick");
  await ensureSchemaPatches();

  return (
    <div className="space-y-6">
      <PageHeader
        title="גלי ליקוט"
        description="Wave picking + בקרת איכות (QC)"
        tabs={<SectionTabs section="fulfillment" />}
      />
      <WavesPanel />
    </div>
  );
}
