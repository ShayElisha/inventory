import { NextResponse } from "next/server";
import { toCsv } from "@/lib/export";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const csv = toCsv(
    ["הזמנה", "לקוח", "SKU", "כמות", "מחיר", "עדיפות"],
    [["SO-100", "לקוח לדוגמה", "SKU-001", "2", "50", "3"]]
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="sales-orders-template.csv"',
    },
  });
}
