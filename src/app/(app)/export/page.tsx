import { Card, PageHeader } from "@/components/ui";
import { Download } from "lucide-react";

export default function ExportPage() {
  return (
    <div>
      <PageHeader
        title="ייצוא נתונים"
        description="CSV או Excel מעוצב לקטלוג ותנועות"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">קטלוג — Excel</h2>
          <a
            href="/api/export/excel?type=catalog"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Download className="h-4 w-4" />
            הורד catalog.xlsx
          </a>
          <a href="/api/export/catalog" className="text-sm text-teal-700 underline">
            או CSV
          </a>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">תנועות — Excel</h2>
          <a
            href="/api/export/excel?type=transactions"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            <Download className="h-4 w-4" />
            הורד transactions.xlsx
          </a>
          <a
            href="/api/export/transactions"
            className="text-sm text-teal-700 underline"
          >
            או CSV
          </a>
        </Card>
      </div>
    </div>
  );
}
