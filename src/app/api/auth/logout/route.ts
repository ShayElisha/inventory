import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await writeAudit({
      action: "LOGOUT",
      entityType: "User",
      entityId: session.id,
      userId: session.id,
    });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
