import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

async function getOwned(id: string, companyId: string) {
  return prisma.pickTemplate.findFirst({
    where: { id, companyId },
    include: { items: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
  }

  const body = await req.json();
  const data: { name?: string; notes?: string | null; active?: boolean } = {};

  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "שם חובה" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }
  if (body.active !== undefined) {
    data.active = Boolean(body.active);
  }

  if (Array.isArray(body.items)) {
    const cleaned = body.items
      .map((it: { variantId?: string; quantity?: number }) => ({
        variantId: String(it.variantId || ""),
        quantity: Math.max(1, Number(it.quantity) || 1),
      }))
      .filter((it: { variantId: string }) => it.variantId);

    const byVariant = new Map<string, number>();
    for (const it of cleaned) {
      byVariant.set(it.variantId, Math.max(byVariant.get(it.variantId) || 0, it.quantity));
    }
    const variantIds = [...byVariant.keys()];
    if (variantIds.length === 0) {
      return NextResponse.json({ error: "הוסיפו לפחות פריט אחד" }, { status: 400 });
    }
    const owned = await prisma.productVariant.count({
      where: {
        id: { in: variantIds },
        product: { companyId: session.companyId },
      },
    });
    if (owned !== variantIds.length) {
      return NextResponse.json({ error: "יש פריטים שאינם שייכים לחברה" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.pickTemplateItem.deleteMany({ where: { templateId: id } }),
      prisma.pickTemplateItem.createMany({
        data: [...byVariant.entries()].map(([variantId, quantity]) => ({
          templateId: id,
          variantId,
          quantity,
        })),
      }),
      prisma.pickTemplate.update({
        where: { id },
        data,
      }),
    ]);
  } else {
    await prisma.pickTemplate.update({ where: { id }, data });
  }

  const template = await prisma.pickTemplate.findUnique({
    where: { id },
    include: {
      items: {
        include: { variant: { include: { product: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  await writeAudit({
    action: "UPDATE_PICK_TEMPLATE",
    entityType: "PickTemplate",
    entityId: id,
    details: data,
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
  }

  // soft-delete so history on pick lists stays readable
  await prisma.pickTemplate.update({
    where: { id },
    data: { active: false },
  });

  await writeAudit({
    action: "DELETE_PICK_TEMPLATE",
    entityType: "PickTemplate",
    entityId: id,
    details: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
