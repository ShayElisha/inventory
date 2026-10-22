import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  hashPassword,
  slugifyCompany,
} from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companyName = String(body.companyName || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const adminName = String(body.adminName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!companyName || !adminName || !email) {
      return NextResponse.json(
        { error: "נא למלא שם חברה, שם מנהל ואימייל" },
        { status: 400 }
      );
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "האימייל כבר רשום במערכת" }, { status: 400 });
    }

    let slug = slugifyCompany(companyName);
    const slugTaken = await prisma.company.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, slug, phone },
      });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: adminName,
          email,
          passwordHash,
          role: ROLES.ADMIN,
        },
      });
      return { company, user };
    });

    await createSession({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: ROLES.ADMIN,
      companyId: result.company.id,
      companyName: result.company.name,
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    await writeAudit({
      action: "REGISTER_COMPANY",
      entityType: "Company",
      entityId: result.company.id,
      userId: result.user.id,
      ip,
      details: { companyName, email },
    });

    return NextResponse.json(
      {
        company: { id: result.company.id, name: result.company.name },
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בהרשמת החברה" }, { status: 400 });
  }
}
