import { unstable_noStore as noStore } from "next/cache";
import { PageHeader } from "@/components/ui";
import { PutawayPanel } from "@/components/putaway-panel";
import { SectionTabs } from "@/components/section-tabs";
import { requireModule } from "@/lib/tenant";
import { ensureSchemaPatches } from "@/lib/db";

export default async function PutawayPage() {
  noStore();
  await requireModule("inbound");
  await ensureSchemaPatches();

  return (
    <div className="space-y-6">
      <PageHeader
        title="השמה למדף"
        description="קליטה → הצעת מיקום → אישור"
        tabs={<SectionTabs section="purchase" />}
      />
      <PutawayPanel />
    </div>
  );
}
