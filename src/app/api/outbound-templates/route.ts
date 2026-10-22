import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { assertModuleApi } from "@/lib/tenant";

export async function GET() {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const templates = await prisma.outboundTemplate.findMany({
    where: { companyId: session.companyId, active: true },
    include: {
      items: true,
      _count: { select: { items: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const notes = body.notes ? String(body.notes).trim() : null;
  const reasonCode = String(body.reasonCode || "SALE");
  const items = Array.isArray(body.items) ? body.items : [];

  if (!name) {
    return NextResponse.json({ error: "שם תבנית חובה" }, { status: 400 });
  }
  if (!OUTBOUND_REASONS.some((r) => r.code === reasonCode)) {
    return NextResponse.json({ error: "סיבת ניפוק לא חוקית" }, { status: 400 });
  }
  if (!items.length) {
    return NextResponse.json({ error: "הוסיפו לפחות פריט אחד" }, { status: 400 });
  }

  const byVariant = new Map<string, number>();
  for (const it of items) {
    const variantId = String(it.variantId || "");
    const quantity = Math.max(1, Number(it.quantity) || 1);
    if (!variantId) continue;
    byVariant.set(variantId, Math.max(byVariant.get(variantId) || 0, quantity));
  }
  const variantIds = [...byVariant.keys()];
  if (!variantIds.length) {
    return NextResponse.json({ error: "הוסיפו לפחות פריט אחד" }, { status: 400 });
  }

  const owned = await prisma.productVariant.count({
    where: { id: { in: variantIds }, product: { companyId: session.companyId } },
  });
  if (owned !== variantIds.length) {
    return NextResponse.json({ error: "יש פריטים שאינם שייכים לחברה" }, { status: 400 });
  }

  const template = await prisma.outboundTemplate.create({
    data: {
      companyId: session.companyId,
      name,
      notes,
      reasonCode,
      createdById: session.id,
      items: {
        create: [...byVariant.entries()].map(([variantId, quantity]) => ({
          variantId,
          quantity,
        })),
      },
    },
    include: { items: true, _count: { select: { items: true } } },
  });

  await writeAudit({
    action: "CREATE_OUTBOUND_TEMPLATE",
    entityType: "OutboundTemplate",
    entityId: template.id,
    details: { name, itemCount: byVariant.size, reasonCode },
  });

  return NextResponse.json(template, { status: 201 });
}
