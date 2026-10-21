import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "שם ספק חובה" }, { status: 400 });
    }
    const supplier = await prisma.supplier.create({
      data: { name: String(name).trim() },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת ספק" }, { status: 400 });
  }
}
