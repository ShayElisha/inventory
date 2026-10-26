import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  ensureDefaultUsers,
  findUserByLogin,
  isSuperAdmin,
  sessionFromUser,
  verifyPassword,
} from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rl = await rateLimit({
    key: `login:${ip}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.", code: "RATE_LIMIT" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  try {
    await ensureDefaultUsers();
  } catch (e) {
    logger.error("ensureDefaultUsers failed", { err: e });
  }

  const body = await req.json();
  const identifier = String(
    body.identifier || body.email || body.phone || ""
  ).trim();
  const password = String(body.password || "");

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "נא להזין אימייל או טלפון וסיסמה" },
      { status: 400 }
    );
  }

  // rate limit גם לפי מזהה התחברות
  const rlId = await rateLimit({
    key: `login-id:${identifier.toLowerCase()}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rlId.ok) {
    return NextResponse.json(
      { error: "יותר מדי ניסיונות למזהה זה", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(rlId.retryAfterSec) } }
    );
  }

  const user = await findUserByLogin(identifier);
  if (!user || !user.active) {
    return NextResponse.json({ error: "פרטי התחברות שגויים" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "פרטי התחברות שגויים" }, { status: 401 });
  }

  if (user.role !== ROLES.SUPER_ADMIN && user.company) {
    if (!user.company.approved) {
      return NextResponse.json(
        {
          error:
            "החברה ממתינה לאישור מנהל הפלטפורמה. לא ניתן להתחבר עד לאישור.",
        },
        { status: 403 }
      );
    }
    if (!user.company.active) {
      return NextResponse.json(
        { error: "החברה מושעית. פנו למנהל הפלטפורמה." },
        { status: 403 }
      );
    }
  }

  const sessionUser = sessionFromUser(user);
  await createSession(sessionUser);

  await writeAudit({
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    ip,
    userId: user.id,
    details: {
      identifier,
      email: user.email,
      phone: user.phone,
      companyId: user.companyId,
    },
  });

  return NextResponse.json({
    user: {
      ...sessionUser,
      isSuperAdmin: isSuperAdmin(user.role),
    },
  });
}
