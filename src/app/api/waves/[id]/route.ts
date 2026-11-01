import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const wave = await prisma.pickWave.findFirst({
    where: { id, companyId: session.companyId },
    include: { pickLists: true },
  });
  if (!wave) {
    return NextResponse.json({ error: "גל לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  if (action === "start") {
    await prisma.pickWave.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });
    await prisma.pickList.updateMany({
      where: { waveId: id, status: "OPEN" },
      data: { status: "IN_PROGRESS" },
    });
  } else if (action === "complete") {
    await prisma.pickWave.update({
      where: { id },
      data: { status: "DONE" },
    });
  } else if (action === "qc") {
    const pickListId = String(body.pickListId || "");
    const result = String(body.result || "PASSED").toUpperCase();
    if (!["PASSED", "FAILED"].includes(result)) {
      return NextResponse.json({ error: "תוצאת QC לא תקינה" }, { status: 400 });
    }
    const pick = wave.pickLists.find((p) => p.id === pickListId);
    if (!pick) {
      return NextResponse.json({ error: "רשימה לא בגל" }, { status: 404 });
    }
    await prisma.pickList.update({
      where: { id: pickListId },
      data: { qcStatus: result },
    });
    await writeAudit({
      action: "PICK_QC",
      entityType: "PickList",
      entityId: pickListId,
      details: { result, waveId: id },
    });
  } else if (action === "cancel") {
    await prisma.pickWave.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await prisma.pickList.updateMany({
      where: { waveId: id },
      data: { waveId: null },
    });
  } else {
    return NextResponse.json({ error: "פעולה לא נתמכת" }, { status: 400 });
  }

  const fresh = await prisma.pickWave.findFirst({
    where: { id },
    include: {
      pickLists: {
        select: {
          id: true,
          reference: true,
          status: true,
          qcStatus: true,
        },
      },
    },
  });
  return NextResponse.json(fresh);
}
