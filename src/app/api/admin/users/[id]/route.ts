import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, isSuperAdmin } from "@/lib/auth";
import { COMPANY_ROLES, ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.user.findFirst({
      where: { id, role: { not: ROLES.SUPER_ADMIN } },
    });
    if (!existing) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const data: {
      name?: string;
      email?: string;
      role?: string;
      active?: boolean;
      companyId?: string;
      passwordHash?: string;
    } = {};

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "שם חובה" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.email != null) {
      const email = String(body.email).trim().toLowerCase();
      const taken = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      });
      if (taken) {
        return NextResponse.json({ error: "האימייל כבר בשימוש" }, { status: 400 });
      }
      data.email = email;
    }
    if (body.role != null) {
      if (!(COMPANY_ROLES as readonly string[]).includes(body.role)) {
        return NextResponse.json({ error: "תפקיד לא חוקי" }, { status: 400 });
      }
      data.role = body.role;
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }
    if (body.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: body.companyId, slug: { not: "platform" } },
      });
      if (!company) {
        return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
      }
      data.companyId = body.companyId;
    }
    if (body.password) {
      const pwdError = validatePassword(String(body.password));
      if (pwdError) {
        return NextResponse.json({ error: pwdError }, { status: 400 });
      }
      data.passwordHash = await hashPassword(String(body.password));
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    await writeAudit({
      action: "ADMIN_UPDATE_USER",
      entityType: "User",
      entityId: id,
      userId: session.id,
      details: {
        ...body,
        password: body.password ? "[changed]" : undefined,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      company: user.company,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון משתמש" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const { id } = await params;
    if (id === session.id) {
      return NextResponse.json({ error: "לא ניתן למחוק את עצמך" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({
      where: { id, role: { not: ROLES.SUPER_ADMIN } },
    });
    if (!existing) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    await writeAudit({
      action: "ADMIN_DELETE_USER",
      entityType: "User",
      entityId: id,
      userId: session.id,
      details: { email: existing.email },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת משתמש" }, { status: 400 });
  }
}
