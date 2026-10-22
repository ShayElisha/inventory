import { PageHeader } from "@/components/ui";
import { ReportsPanel } from "@/components/reports-panel";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="דוחות וניתוחים"
        description="תנועות, מלאי מת, שווי, Top 20, פחת, דיוק ספירה והשוואת תקופות"
      />
      <ReportsPanel />
    </div>
  );
}
