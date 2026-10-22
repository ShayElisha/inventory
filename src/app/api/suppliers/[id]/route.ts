import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "שם ספק חובה" }, { status: 400 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name: String(name).trim() },
    });

    await writeAudit({
      action: "UPDATE",
      entityType: "Supplier",
      entityId: id,
      details: { name: supplier.name },
    });

    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון ספק" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { supplierId: id, companyId: session.companyId },
        data: { supplierId: null },
      });
      await tx.supplier.delete({ where: { id } });
    });

    await writeAudit({
      action: "DELETE",
      entityType: "Supplier",
      entityId: id,
      details: { name: existing.name, productsUnlinked: existing._count.products },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "שגיאה במחיקת ספק" }, { status: 400 });
  }
}
