import { Card, PageHeader } from "@/components/ui";
import { Download } from "lucide-react";

const EXPORTS = [
  {
    title: "קטלוג מוצרים",
    excel: "/api/export/excel?type=catalog",
    excelName: "catalog.xlsx",
    csv: "/api/export/catalog",
  },
  {
    title: "תנועות מלאי",
    excel: "/api/export/excel?type=transactions",
    excelName: "transactions.xlsx",
    csv: "/api/export/transactions",
  },
  {
    title: "לקוחות",
    excel: "/api/export/excel?type=customers",
    excelName: "customers.xlsx",
    csv: "/api/export/customers",
  },
  {
    title: "הזמנות מכירה",
    excel: "/api/export/excel?type=sales-orders",
    excelName: "sales-orders.xlsx",
    csv: "/api/export/sales-orders",
  },
  {
    title: "הזמנות רכש",
    excel: "/api/export/excel?type=purchase-orders",
    excelName: "purchase-orders.xlsx",
    csv: "/api/export/purchase-orders",
  },
] as const;

export default function ExportPage() {
  return (
    <div>
      <PageHeader
        title="ייצוא נתונים"
        description="CSV או Excel — קטלוג, תנועות, לקוחות והזמנות"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((item) => (
          <Card key={item.title} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <a
              href={item.excel}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
            >
              <Download className="h-4 w-4" />
              הורד {item.excelName}
            </a>
            <a href={item.csv} className="text-sm text-[var(--accent)] underline">
              או CSV
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
