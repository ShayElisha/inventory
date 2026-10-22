import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId || !canAdmin(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.customField.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "שדה לא נמצא" }, { status: 404 });
  }

  await prisma.customField.update({
    where: { id },
    data: { active: false },
  });

  await writeAudit({
    action: "DELETE_CUSTOM_FIELD",
    entityType: "CustomField",
    entityId: id,
    details: { key: existing.key, label: existing.label },
  });

  return NextResponse.json({ ok: true });
}
