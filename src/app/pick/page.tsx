import { PageHeader } from "@/components/ui";
import { QuickPick } from "@/components/quick-pick";

export default function PickPage() {
  return (
    <div>
      <PageHeader
        title="ניפוק מהיר"
        description="חיפוש לפי שם, מק״ט או ברקוד → כמות → אישור."
      />
      <QuickPick />
    </div>
  );
}
