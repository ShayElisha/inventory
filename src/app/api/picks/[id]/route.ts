import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyStockChange } from "@/lib/stock";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session!;
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
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session!;
  const { id } = await params;
  const body = await req.json();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const listMeta = await prisma.pickList.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true, status: true },
  });
  if (!listMeta) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  if (listMeta.status === "CANCELLED" || listMeta.status === "DONE") {
    if (body.action === "add_item" || body.action === "remove_item") {
      return NextResponse.json(
        { error: "לא ניתן לערוך רשימה שנסגרה או בוטלה" },
        { status: 400 }
      );
    }
  }

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
      userId: session.id,
      companyId: session.companyId,
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

  if (body.action === "add_item") {
    const variantId = String(body.variantId || "");
    const quantity = Math.max(1, Number(body.quantity) || 1);
    if (!variantId) {
      return NextResponse.json({ error: "חסר פריט" }, { status: 400 });
    }

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, product: { companyId: session.companyId } },
    });
    if (!variant) {
      return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
    }

    const existingItem = await prisma.pickListItem.findFirst({
      where: { pickListId: id, variantId },
    });

    if (existingItem) {
      if (existingItem.status === "DONE") {
        return NextResponse.json(
          { error: "הפריט כבר נלקט במלואו — לא ניתן להוסיף שוב" },
          { status: 400 }
        );
      }
      await prisma.pickListItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.pickListItem.create({
        data: { pickListId: id, variantId, quantity },
      });
    }

    await prisma.pickList.update({
      where: { id },
      data: {
        status: listMeta.status === "DONE" ? "IN_PROGRESS" : listMeta.status === "OPEN" ? "IN_PROGRESS" : listMeta.status,
        updatedAt: new Date(),
      },
    });

    await writeAudit({
      action: "PICK_ADD_ITEM",
      entityType: "PickList",
      entityId: id,
      details: { variantId, quantity },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove_item") {
    const itemId = String(body.itemId || "");
    const item = await prisma.pickListItem.findUnique({ where: { id: itemId } });
    if (!item || item.pickListId !== id) {
      return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
    }
    if (item.pickedQty > 0) {
      return NextResponse.json(
        {
          error:
            "לא ניתן להסיר פריט שכבר נלקט חלקית. אפשר ללקט את היתרה או לבטל את הרשימה.",
        },
        { status: 400 }
      );
    }

    await prisma.pickListItem.delete({ where: { id: itemId } });

    const remaining = await prisma.pickListItem.count({
      where: { pickListId: id },
    });
    if (remaining === 0) {
      await prisma.pickList.update({
        where: { id },
        data: { status: "CANCELLED", updatedAt: new Date() },
      });
    } else {
      const pending = await prisma.pickListItem.count({
        where: { pickListId: id, status: "PENDING" },
      });
      if (pending === 0) {
        await prisma.pickList.update({
          where: { id },
          data: { status: "DONE", updatedAt: new Date() },
        });
      }
    }

    await writeAudit({
      action: "PICK_REMOVE_ITEM",
      entityType: "PickList",
      entityId: id,
      details: { itemId, variantId: item.variantId },
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
