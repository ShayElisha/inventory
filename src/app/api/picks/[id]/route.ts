import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyStockChange } from "@/lib/stock";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const { id } = await params;
  const list = await prisma.pickList.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      items: {
        include: { variant: { include: { product: true, location: true } } },
      },
      createdBy: true,
    },
  });
  if (!list) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(list);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const owned = await prisma.pickList.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  if (body.action === "pick_item") {
    const item = await prisma.pickListItem.findUnique({
      where: { id: body.itemId },
    });
    if (!item || item.pickListId !== id) {
      return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
    }
    const qty = Number(body.quantity ?? item.quantity - item.pickedQty);
    if (qty <= 0) return NextResponse.json({ error: "כמות לא תקינה" }, { status: 400 });

    await applyStockChange({
      variantId: item.variantId,
      type: "OUTBOUND",
      quantityChanged: qty,
      reason: `ליקוט הזמנה`,
      reasonCode: "SALE",
      userId: session?.id,
    });

    const pickedQty = item.pickedQty + qty;
    await prisma.pickListItem.update({
      where: { id: item.id },
      data: {
        pickedQty,
        status: pickedQty >= item.quantity ? "DONE" : "PENDING",
      },
    });

    await prisma.pickList.update({
      where: { id },
      data: { status: "IN_PROGRESS", updatedAt: new Date() },
    });

    const remaining = await prisma.pickListItem.count({
      where: { pickListId: id, status: "PENDING" },
    });
    if (remaining === 0) {
      await prisma.pickList.update({
        where: { id },
        data: { status: "DONE", updatedAt: new Date() },
      });
    }

    await writeAudit({
      action: "PICK_ITEM",
      entityType: "PickList",
      entityId: id,
      details: { itemId: item.id, qty },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.status) {
    const list = await prisma.pickList.update({
      where: { id },
      data: { status: body.status, updatedAt: new Date() },
    });
    return NextResponse.json(list);
  }

  return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
}
