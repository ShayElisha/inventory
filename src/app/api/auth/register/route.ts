import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, slugifyCompany } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { writeAudit } from "@/lib/audit";
import { validatePassword } from "@/lib/password";
import {
  isEmail,
  looksLikePhone,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (process.env.DISABLE_PUBLIC_REGISTER === "true") {
    return NextResponse.json(
      { error: "הרשמה ציבורית כבויה. פנו למנהל הפלטפורמה." },
      { status: 403 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rl = await rateLimit({
    key: `register:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "יותר מדי ניסיונות הרשמה. נסו שוב מאוחר יותר.",
        code: "RATE_LIMIT",
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = await req.json();
    const companyName = String(body.companyName || "").trim();
    const companyPhoneRaw = String(body.companyPhone || body.phone || "").trim();
    const adminName = String(body.adminName || "").trim();
    const emailRaw = String(body.email || "").trim();
    const adminPhoneRaw = String(body.adminPhone || "").trim();
    const password = String(body.password || "");

    if (!companyName || !adminName) {
      return NextResponse.json(
        { error: "נא למלא שם חברה ושם מנהל" },
        { status: 400 }
      );
    }

    const email = emailRaw ? normalizeEmail(emailRaw) : null;
    const adminPhone = adminPhoneRaw ? normalizePhone(adminPhoneRaw) : null;

    if (!email && !adminPhone) {
      return NextResponse.json(
        { error: "נא למלא אימייל או טלפון להתחברות (לפחות אחד)" },
        { status: 400 }
      );
    }
    if (emailRaw && !isEmail(emailRaw)) {
      return NextResponse.json({ error: "אימייל לא תקין" }, { status: 400 });
    }
    if (adminPhoneRaw && !looksLikePhone(adminPhoneRaw)) {
      return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json(
          { error: "האימייל כבר רשום במערכת" },
          { status: 400 }
        );
      }
    }
    if (adminPhone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: adminPhone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "הטלפון כבר רשום במערכת" },
          { status: 400 }
        );
      }
    }

    let slug = slugifyCompany(companyName);
    const slugTaken = await prisma.company.findUnique({ where: { slug } });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const passwordHash = await hashPassword(password);
    const companyPhone = companyPhoneRaw
      ? normalizePhone(companyPhoneRaw) || companyPhoneRaw
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
          phone: companyPhone,
          approved: false,
          active: true,
        },
      });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: adminName,
          email,
          phone: adminPhone,
          passwordHash,
          role: ROLES.ADMIN,
        },
      });
      return { company, user };
    });

    await writeAudit({
      action: "REGISTER_COMPANY",
      entityType: "Company",
      entityId: result.company.id,
      userId: result.user.id,
      ip,
      details: {
        companyName,
        email,
        phone: adminPhone,
        pendingApproval: true,
      },
    });

    return NextResponse.json(
      {
        company: {
          id: result.company.id,
          name: result.company.name,
          approved: false,
        },
        pendingApproval: true,
        message:
          "החברה נרשמה בהצלחה וממתינה לאישור מנהל הפלטפורמה. לאחר האישור תוכלו להתחבר.",
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בהרשמת החברה" }, { status: 400 });
  }
}
