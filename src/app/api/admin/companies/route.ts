import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSession,
  hashPassword,
  isSuperAdmin,
  slugifyCompany,
} from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    where: { slug: { not: "platform" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          products: true,
          locations: true,
          categories: true,
        },
      },
    },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const companyName = String(body.name || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const adminName = String(body.adminName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!companyName || !adminName || !email || password.length < 6) {
      return NextResponse.json(
        { error: "נא למלא שם חברה, מנהל, אימייל וסיסמה (6+ תווים)" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "האימייל כבר רשום" }, { status: 400 });
    }

    let slug = slugifyCompany(companyName);
    if (slug === "platform") slug = `company-${Date.now().toString(36)}`;
    const slugTaken = await prisma.company.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, slug, phone, active: true },
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

    await writeAudit({
      action: "ADMIN_CREATE_COMPANY",
      entityType: "Company",
      entityId: result.company.id,
      userId: session.id,
      details: { name: companyName, adminEmail: email },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה ביצירת חברה" }, { status: 400 });
  }
}
