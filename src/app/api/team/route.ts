import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, canAdmin } from "@/lib/auth";
import { COMPANY_ROLES, ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/password";
import {
  formatPhoneDisplay,
  isEmail,
  looksLikePhone,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      companyId: session.companyId,
      role: { not: ROLES.SUPER_ADMIN },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      ...u,
      phoneDisplay: formatPhoneDisplay(u.phone),
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.companyId || !canAdmin(session.role)) {
      return NextResponse.json({ error: "רק מנהל חברה יכול להוסיף עובדים" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();
    const emailRaw = String(body.email || "").trim();
    const phoneRaw = String(body.phone || "").trim();
    const role = String(body.role || ROLES.WAREHOUSE);

    if (!name) {
      return NextResponse.json({ error: "שם עובד חובה" }, { status: 400 });
    }
    if (!(COMPANY_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: "תפקיד לא חוקי" }, { status: 400 });
    }

    const email = emailRaw ? normalizeEmail(emailRaw) : null;
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "נא למלא אימייל או טלפון (לפחות אחד)" },
        { status: 400 }
      );
    }
    if (emailRaw && !isEmail(emailRaw)) {
      return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
    }
    if (phoneRaw && !looksLikePhone(phoneRaw)) {
      return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });
    }

    if (email) {
      const taken = await prisma.user.findUnique({ where: { email } });
      if (taken) {
        return NextResponse.json({ error: "האימייל כבר רשום" }, { status: 400 });
      }
    }
    if (phone) {
      const taken = await prisma.user.findUnique({ where: { phone } });
      if (taken) {
        return NextResponse.json({ error: "הטלפון כבר רשום" }, { status: 400 });
      }
    }

    const tempPassword = generateTempPassword();

    const user = await prisma.user.create({
      data: {
        companyId: session.companyId,
        name,
        email,
        phone,
        passwordHash: await hashPassword(tempPassword),
        role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await writeAudit({
      action: "CREATE_EMPLOYEE",
      entityType: "User",
      entityId: user.id,
      details: { name, email, phone, role, tempPassword: true },
    });

    return NextResponse.json(
      {
        ...user,
        phoneDisplay: formatPhoneDisplay(user.phone),
        tempPassword,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בהוספת עובד" }, { status: 400 });
  }
}
