import { Card, PageHeader } from "@/components/ui";
import { Download } from "lucide-react";

export default function ExportPage() {
  return (
    <div>
      <PageHeader
        title="ייצוא נתונים"
        description="הורדת קטלוג ותנועות מלאי לקובץ CSV (תואם Excel)"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">קטלוג ווריאציות</h2>
          <p className="text-sm text-slate-600">
            כולל SKU, ברקוד, מאפיינים, כמויות, מיקומים ומחירים
          </p>
          <a
            href="/api/export/catalog"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Download className="h-4 w-4" />
            הורד catalog.csv
          </a>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">יומן תנועות מלאי</h2>
          <p className="text-sm text-slate-600">
            כל רשומות INBOUND / OUTBOUND / TRANSFER / ADJUSTMENT
          </p>
          <a
            href="/api/export/transactions"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Download className="h-4 w-4" />
            הורד transactions.csv
          </a>
        </Card>
      </div>
    </div>
  );
}
