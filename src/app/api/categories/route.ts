import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  const categories = await prisma.category.findMany({
    where: { companyId: session.companyId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { name, hasVariants, attributeSchema } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "שם קטגוריה חובה" }, { status: 400 });
    }

    const schema = Array.isArray(attributeSchema)
      ? attributeSchema.map(String).filter(Boolean)
      : String(attributeSchema || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

    const category = await prisma.category.create({
      data: {
        companyId: session.companyId,
        name: String(name).trim(),
        hasVariants: Boolean(hasVariants),
        attributeSchema: stringifyJson(hasVariants ? schema : []),
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת קטגוריה" }, { status: 400 });
  }
}
