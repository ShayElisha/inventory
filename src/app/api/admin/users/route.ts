import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, isSuperAdmin } from "@/lib/auth";
import { COMPANY_ROLES, ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  const users = await prisma.user.findMany({
    where: {
      role: { not: ROLES.SUPER_ADMIN },
      ...(companyId ? { companyId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true, slug: true, active: true } },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      company: u.company,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const companyId = String(body.companyId || "");
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || ROLES.WAREHOUSE);

    if (!companyId || !name || !email) {
      return NextResponse.json(
        { error: "נא למלא חברה, שם ואימייל" },
        { status: 400 }
      );
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }
    if (!(COMPANY_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: "תפקיד לא חוקי" }, { status: 400 });
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, slug: { not: "platform" } },
    });
    if (!company) {
      return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "האימייל כבר רשום" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        companyId,
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
        active: true,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    await writeAudit({
      action: "ADMIN_CREATE_USER",
      entityType: "User",
      entityId: user.id,
      userId: session.id,
      details: { email, companyId, role },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        company: user.company,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת משתמש" }, { status: 400 });
  }
}
