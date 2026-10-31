import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

const STATUSES = new Set(["OPEN", "NOTIFIED", "FULFILLED", "CANCELLED"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.waitlistItem.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    status?: string;
    notes?: string | null;
    quantity?: number;
  } = {};

  if (body.status != null) {
    const status = String(body.status);
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    data.status = status;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }
  if (body.quantity != null) {
    data.quantity = Math.max(1, Number(body.quantity) || 1);
  }

  const item = await prisma.waitlistItem.update({
    where: { id },
    data,
    include: {
      variant: { include: { product: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  await writeAudit({
    action: "UPDATE_WAITLIST",
    entityType: "WaitlistItem",
    entityId: id,
    details: data,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.waitlistItem.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  await prisma.waitlistItem.delete({ where: { id } });
  await writeAudit({
    action: "DELETE_WAITLIST",
    entityType: "WaitlistItem",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
