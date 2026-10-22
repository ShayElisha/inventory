import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, canAdmin } from "@/lib/auth";
import { COMPANY_ROLES, ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";
import {
  formatPhoneDisplay,
  isEmail,
  looksLikePhone,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact";

async function getOwnedEmployee(id: string, companyId: string) {
  return prisma.user.findFirst({
    where: {
      id,
      companyId,
      role: { not: ROLES.SUPER_ADMIN },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.companyId || !canAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await getOwnedEmployee(id, session.companyId);
    if (!existing) {
      return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      role?: string;
      active?: boolean;
      passwordHash?: string;
    } = {};

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "שם חובה" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.email !== undefined) {
      const emailRaw = String(body.email || "").trim();
      if (!emailRaw) {
        data.email = null;
      } else {
        if (!isEmail(emailRaw)) {
          return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
        }
        const email = normalizeEmail(emailRaw);
        const taken = await prisma.user.findFirst({
          where: { email, id: { not: id } },
        });
        if (taken) {
          return NextResponse.json({ error: "האימייל כבר בשימוש" }, { status: 400 });
        }
        data.email = email;
      }
    }

    if (body.phone !== undefined) {
      const phoneRaw = String(body.phone || "").trim();
      if (!phoneRaw) {
        data.phone = null;
      } else {
        if (!looksLikePhone(phoneRaw)) {
          return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });
        }
        const phone = normalizePhone(phoneRaw);
        const taken = await prisma.user.findFirst({
          where: { phone, id: { not: id } },
        });
        if (taken) {
          return NextResponse.json({ error: "הטלפון כבר בשימוש" }, { status: 400 });
        }
        data.phone = phone;
      }
    }

    if (body.role != null) {
      if (!(COMPANY_ROLES as readonly string[]).includes(body.role)) {
        return NextResponse.json({ error: "תפקיד לא חוקי" }, { status: 400 });
      }
      // לא מאפשרים להוריד את עצמך ממנהל אם אין מנהל אחר
      if (id === session.id && body.role !== ROLES.ADMIN) {
        const otherAdmins = await prisma.user.count({
          where: {
            companyId: session.companyId,
            role: ROLES.ADMIN,
            active: true,
            id: { not: id },
          },
        });
        if (otherAdmins === 0) {
          return NextResponse.json(
            { error: "חייבים להשאיר לפחות מנהל אחד בחברה" },
            { status: 400 }
          );
        }
      }
      data.role = body.role;
    }

    if (body.active !== undefined) {
      if (id === session.id && body.active === false) {
        return NextResponse.json(
          { error: "לא ניתן להשעות את עצמך" },
          { status: 400 }
        );
      }
      data.active = Boolean(body.active);
    }

    if (body.password) {
      const pwdError = validatePassword(String(body.password));
      if (pwdError) {
        return NextResponse.json({ error: pwdError }, { status: 400 });
      }
      data.passwordHash = await hashPassword(String(body.password));
    }

    // ודא שנשאר לפחות אימייל או טלפון
    const nextEmail = data.email !== undefined ? data.email : existing.email;
    const nextPhone = data.phone !== undefined ? data.phone : existing.phone;
    if (!nextEmail && !nextPhone) {
      return NextResponse.json(
        { error: "חייבים אימייל או טלפון להתחברות" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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
      action: "UPDATE_EMPLOYEE",
      entityType: "User",
      entityId: id,
      details: {
        ...body,
        password: body.password ? "[changed]" : undefined,
      },
    });

    return NextResponse.json({
      ...user,
      phoneDisplay: formatPhoneDisplay(user.phone),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון עובד" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.companyId || !canAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const { id } = await params;
    if (id === session.id) {
      return NextResponse.json({ error: "לא ניתן למחוק את עצמך" }, { status: 400 });
    }

    const existing = await getOwnedEmployee(id, session.companyId);
    if (!existing) {
      return NextResponse.json({ error: "עובד לא נמצא" }, { status: 404 });
    }

    if (existing.role === ROLES.ADMIN) {
      const otherAdmins = await prisma.user.count({
        where: {
          companyId: session.companyId,
          role: ROLES.ADMIN,
          active: true,
          id: { not: id },
        },
      });
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: "לא ניתן למחוק את המנהל האחרון" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    await writeAudit({
      action: "DELETE_EMPLOYEE",
      entityType: "User",
      entityId: id,
      details: { email: existing.email, phone: existing.phone, name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת עובד" }, { status: 400 });
  }
}
