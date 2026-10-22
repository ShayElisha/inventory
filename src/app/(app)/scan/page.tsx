import { PageHeader } from "@/components/ui";
import { ScanConsole } from "@/components/scan-console";

export default function ScanPage() {
  return (
    <div>
      <PageHeader
        title="ממשק סריקה"
        description="מותאם למסופון ולסמארטפון — סריקת ברקוד, עדכון מהיר והעברת מדף"
      />
      <ScanConsole />
    </div>
  );
}
