import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { ensureSchemaPatches } from "@/lib/db";

export async function GET() {
  await ensureSchemaPatches();
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const waves = await prisma.pickWave.findMany({
    where: { companyId: session.companyId },
    include: {
      pickLists: {
        select: {
          id: true,
          reference: true,
          status: true,
          qcStatus: true,
          _count: { select: { items: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(waves);
}

export async function POST(req: NextRequest) {
  await ensureSchemaPatches();
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const pickListIds: string[] = Array.isArray(body.pickListIds)
    ? body.pickListIds.map(String)
    : [];

  if (!pickListIds.length) {
    // אוטומטי: כל הליקוטים הפתוחים בלי wave
    const open = await prisma.pickList.findMany({
      where: {
        companyId: session.companyId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        waveId: null,
      },
      select: { id: true },
      take: 40,
    });
    pickListIds.push(...open.map((p) => p.id));
  }

  if (!pickListIds.length) {
    return NextResponse.json({ error: "אין רשימות ליקוט לגל" }, { status: 400 });
  }

  const owned = await prisma.pickList.count({
    where: {
      id: { in: pickListIds },
      companyId: session.companyId,
    },
  });
  if (owned !== pickListIds.length) {
    return NextResponse.json({ error: "רשימות לא שייכות לחברה" }, { status: 403 });
  }

  const number =
    String(body.number || "").trim() ||
    `WAVE-${Date.now().toString(36).toUpperCase()}`;

  const wave = await prisma.pickWave.create({
    data: {
      companyId: session.companyId,
      number,
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      status: "OPEN",
    },
  });

  await prisma.pickList.updateMany({
    where: { id: { in: pickListIds }, companyId: session.companyId },
    data: { waveId: wave.id, qcStatus: "PENDING" },
  });

  await writeAudit({
    action: "CREATE_PICK_WAVE",
    entityType: "PickWave",
    entityId: wave.id,
    details: { pickListIds, number },
  });

  const full = await prisma.pickWave.findFirst({
    where: { id: wave.id },
    include: {
      pickLists: {
        include: { items: true },
      },
    },
  });

  return NextResponse.json(full, { status: 201 });
}
