import { PageHeader } from "@/components/ui";
import { ReportsPanel } from "@/components/reports-panel";
import { requireModule } from "@/lib/tenant";

export default async function ReportsProPage() {
  await requireModule("reportsPro");
  return (
    <div>
      <PageHeader
        title="דוחות פרימיום"
        description="ABC · Aging · רווחיות גולמית · תחלופה ושווי מלאי"
      />
      <ReportsPanel premium />
    </div>
  );
}
