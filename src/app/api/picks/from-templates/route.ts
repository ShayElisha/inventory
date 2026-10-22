import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

/** יוצר רשימות ליקוט נפרדות מכמה תבניות — לליקוט במקביל */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const templateIds: string[] = Array.isArray(body.templateIds)
    ? body.templateIds.map(String)
    : [];
  const referencePrefix = String(body.referencePrefix || "").trim();

  if (templateIds.length === 0) {
    return NextResponse.json(
      { error: "בחרו לפחות תבנית אחת" },
      { status: 400 }
    );
  }

  const templates = await prisma.pickTemplate.findMany({
    where: {
      id: { in: templateIds },
      companyId: session.companyId,
      active: true,
    },
    include: { items: true },
  });

  if (templates.length !== templateIds.length) {
    return NextResponse.json(
      { error: "חלק מהתבניות לא נמצאו או אינן פעילות" },
      { status: 400 }
    );
  }

  const empty = templates.filter((t) => t.items.length === 0);
  if (empty.length) {
    return NextResponse.json(
      { error: `לתבנית "${empty[0]!.name}" אין פריטים` },
      { status: 400 }
    );
  }

  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "");

  const created = await prisma.$transaction(
    templates.map((t) => {
      const ref =
        referencePrefix
          ? `${referencePrefix}-${t.name}`
          : `${t.name}-${stamp}`;
      return prisma.pickList.create({
        data: {
          companyId: session.companyId,
          templateId: t.id,
          reference: ref.slice(0, 120),
          notes: t.notes,
          createdById: session.id,
          status: "OPEN",
          items: {
            create: t.items.map((it) => ({
              variantId: it.variantId,
              quantity: it.quantity,
            })),
          },
        },
        select: { id: true, reference: true, templateId: true },
      });
    })
  );

  await writeAudit({
    action: "CREATE_PICKS_FROM_TEMPLATES",
    entityType: "PickList",
    entityId: created[0]?.id,
    details: {
      templateIds,
      pickListIds: created.map((c) => c.id),
      count: created.length,
    },
  });

  return NextResponse.json({ lists: created }, { status: 201 });
}
