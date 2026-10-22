import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { stringifyJson } from "@/lib/json";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.category.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
    }

    const body = await req.json();
    const name =
      body.name != null ? String(body.name).trim() : existing.name;
    if (!name) {
      return NextResponse.json({ error: "שם קטגוריה חובה" }, { status: 400 });
    }

    const hasVariants =
      body.hasVariants !== undefined
        ? Boolean(body.hasVariants)
        : existing.hasVariants;

    let attributeSchema = existing.attributeSchema;
    if (body.attributeSchema !== undefined) {
      const schema = Array.isArray(body.attributeSchema)
        ? body.attributeSchema.map(String).filter(Boolean)
        : String(body.attributeSchema || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
      attributeSchema = stringifyJson(hasVariants ? schema : []);
    } else if (!hasVariants) {
      attributeSchema = "[]";
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, hasVariants, attributeSchema },
    });

    await writeAudit({
      action: "UPDATE",
      entityType: "Category",
      entityId: id,
      details: { name: category.name },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון קטגוריה" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.category.findFirst({
      where: { id, companyId: session.companyId },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
    }
    if (existing._count.products > 0) {
      return NextResponse.json(
        {
          error: `לא ניתן למחוק — יש ${existing._count.products} מוצרים בקטגוריה. העבירו או מחקו אותם קודם.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    await writeAudit({
      action: "DELETE",
      entityType: "Category",
      entityId: id,
      details: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "שגיאה במחיקת קטגוריה" }, { status: 400 });
  }
}
