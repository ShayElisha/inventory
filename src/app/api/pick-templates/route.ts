import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const templates = await prisma.pickTemplate.findMany({
    where: { companyId: session.companyId, active: true },
    include: {
      items: {
        include: { variant: { include: { product: true, location: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const notes = body.notes ? String(body.notes).trim() : null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!name) {
    return NextResponse.json({ error: "שם תבנית חובה" }, { status: 400 });
  }
  if (!items.length) {
    return NextResponse.json({ error: "הוסיפו לפחות פריט אחד לתבנית" }, { status: 400 });
  }

  const cleaned = items
    .map((it: { variantId?: string; quantity?: number }) => ({
      variantId: String(it.variantId || ""),
      quantity: Math.max(1, Number(it.quantity) || 1),
    }))
    .filter((it: { variantId: string }) => it.variantId);

  // dedupe by variantId — keep max qty
  const byVariant = new Map<string, number>();
  for (const it of cleaned) {
    byVariant.set(it.variantId, Math.max(byVariant.get(it.variantId) || 0, it.quantity));
  }

  const variantIds = [...byVariant.keys()];
  const owned = await prisma.productVariant.count({
    where: {
      id: { in: variantIds },
      product: { companyId: session.companyId },
    },
  });
  if (owned !== variantIds.length) {
    return NextResponse.json({ error: "יש פריטים שאינם שייכים לחברה" }, { status: 400 });
  }

  const template = await prisma.pickTemplate.create({
    data: {
      companyId: session.companyId,
      name,
      notes,
      createdById: session.id,
      items: {
        create: [...byVariant.entries()].map(([variantId, quantity]) => ({
          variantId,
          quantity,
        })),
      },
    },
    include: {
      items: true,
      _count: { select: { items: true } },
    },
  });

  await writeAudit({
    action: "CREATE_PICK_TEMPLATE",
    entityType: "PickTemplate",
    entityId: template.id,
    details: { name, itemCount: byVariant.size },
  });

  return NextResponse.json(template, { status: 201 });
}
