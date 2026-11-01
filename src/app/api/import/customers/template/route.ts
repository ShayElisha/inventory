import { NextResponse } from "next/server";
import { toCsv } from "@/lib/export";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const csv = toCsv(
    ["שם", "טלפון", "אימייל", "כתובת", "ח.פ", "תקרת אשראי", "הערות"],
    [["לקוח לדוגמה", "0501234567", "a@b.com", "תל אביב", "", "10000", ""]]
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customers-template.csv"',
    },
  });
}
