import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/export";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
  });

  const csv = toCsv(
    [
      "שם",
      "טלפון",
      "אימייל",
      "כתובת",
      "ח.פ",
      "תקרת אשראי",
      "הערות",
      "פעיל",
    ],
    customers.map((c) => [
      c.name,
      c.phone ?? "",
      c.email ?? "",
      c.address ?? "",
      c.taxId ?? "",
      c.creditLimit ?? "",
      c.notes ?? "",
      c.active ? "1" : "0",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customers.csv"',
    },
  });
}
