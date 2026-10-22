import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  getSession,
  hashPassword,
  sessionFromUser,
  verifyPassword,
} from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "נא למלא סיסמה נוכחית וסיסמה חדשה" },
        { status: 400 }
      );
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "הסיסמה החדשה חייבת להיות שונה מהנוכחית" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { company: true },
    });
    if (!user || !user.active) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "הסיסמה הנוכחית שגויה" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
      },
      include: { company: true },
    });

    const sessionUser = sessionFromUser(updated);
    await createSession(sessionUser);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    await writeAudit({
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      ip,
      details: { forced: Boolean(session.mustChangePassword) },
    });

    return NextResponse.json({
      ok: true,
      user: sessionUser,
      message: "הסיסמה עודכנה בהצלחה",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון סיסמה" }, { status: 400 });
  }
}
