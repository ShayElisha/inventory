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
    const existing = await prisma.warehouseLocation.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "מיקום לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const zone = String(body.zone ?? existing.zone).trim().toUpperCase();
    const aisle = String(body.aisle ?? existing.aisle).trim();
    const shelf = String(body.shelf ?? existing.shelf).trim();
    const bin = String(body.bin ?? existing.bin).trim();
    if (!zone || !aisle || !shelf || !bin) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }
    const code = `${zone}-${aisle}-${shelf}-${bin}`.toUpperCase();

    const location = await prisma.warehouseLocation.update({
      where: { id },
      data: { zone, aisle, shelf, bin, code },
    });

    await writeAudit({
      action: "UPDATE",
      entityType: "Location",
      entityId: id,
      details: { code },
    });

    return NextResponse.json(location);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "שגיאה בעדכון מיקום (ייתכן שהקוד כבר קיים)" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.warehouseLocation.findFirst({
      where: { id, companyId: session.companyId },
      include: { _count: { select: { variants: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "מיקום לא נמצא" }, { status: 404 });
    }
    if (existing._count.variants > 0) {
      return NextResponse.json(
        {
          error: `לא ניתן למחוק — יש ${existing._count.variants} פריטים במיקום. העבירו אותם קודם.`,
        },
        { status: 400 }
      );
    }

    await prisma.warehouseLocation.delete({ where: { id } });

    await writeAudit({
      action: "DELETE",
      entityType: "Location",
      entityId: id,
      details: { code: existing.code },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "שגיאה במחיקת מיקום" }, { status: 400 });
  }
}
