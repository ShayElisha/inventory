import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  ensureDefaultUsers,
  isSuperAdmin,
  verifyPassword,
} from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { Role, ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  await ensureDefaultUsers();
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { company: true },
  });
  if (!user || !user.active) {
    return NextResponse.json({ error: "פרטי התחברות שגויים" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "פרטי התחברות שגויים" }, { status: 401 });
  }

  if (
    user.role !== ROLES.SUPER_ADMIN &&
    user.company &&
    !user.company.active
  ) {
    return NextResponse.json(
      { error: "החברה מושעית. פנו למנהל הפלטפורמה." },
      { status: 403 }
    );
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    companyId: user.companyId,
    companyName: user.company.name,
  });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  await writeAudit({
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    ip,
    userId: user.id,
    details: { email: user.email, companyId: user.companyId },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
      isSuperAdmin: isSuperAdmin(user.role),
    },
  });
}
