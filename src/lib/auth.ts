import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role, ROLES } from "@/lib/constants";
import {
  detectLoginKind,
  normalizeEmail,
  normalizePhone,
} from "@/lib/contact";
import { allowDemoSeed, getAuthSecret } from "@/lib/secrets";

const COOKIE = "inventory_session";
const secret = () => new TextEncoder().encode(getAuthSecret());

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  companyId: string;
  companyName: string;
  mustChangePassword: boolean;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName,
    mustChangePassword: Boolean(user.mustChangePassword),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(sessionTtl())
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSec(),
  });
}

function sessionDays() {
  const n = Number(process.env.SESSION_DAYS || "7");
  return Number.isFinite(n) && n > 0 && n <= 30 ? n : 7;
}

function sessionTtl() {
  return `${sessionDays()}d`;
}

function sessionMaxAgeSec() {
  return sessionDays() * 60 * 60 * 24;
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email || ""),
      phone: String(payload.phone || ""),
      role: payload.role as Role,
      companyId: String(payload.companyId || ""),
      companyName: String(payload.companyName || ""),
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export function isSuperAdmin(role: Role | string) {
  return role === ROLES.SUPER_ADMIN;
}

export function canWrite(role: Role) {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ADMIN ||
    role === ROLES.WAREHOUSE
  );
}

export function canAdmin(role: Role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

export function slugifyCompany(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `company-${Date.now().toString(36)}`;
}

/** חיפוש משתמש לפי אימייל או טלפון */
export async function findUserByLogin(identifier: string) {
  const kind = detectLoginKind(identifier);
  if (!kind) return null;

  if (kind === "email") {
    const email = normalizeEmail(identifier);
    return prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
  }

  const phone = normalizePhone(identifier);
  if (!phone) return null;
  return prisma.user.findUnique({
    where: { phone },
    include: { company: true },
  });
}

export function sessionFromUser(user: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  companyId: string;
  company: { name: string };
  mustChangePassword?: boolean;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role as Role,
    companyId: user.companyId,
    companyName: user.company.name,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export async function ensureSuperAdmin() {
  let platform = await prisma.company.findUnique({ where: { slug: "platform" } });
  if (!platform) {
    platform = await prisma.company.create({
      data: {
        id: "cm_platform_company_001",
        name: "פלטפורמת Sfira",
        slug: "platform",
        approved: true,
        active: true,
      },
    });
  } else if (!platform.approved) {
    platform = await prisma.company.update({
      where: { id: platform.id },
      data: { approved: true, active: true },
    });
  }

  const email = "super@malaim.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "סופר אדמין",
        email,
        phone: "972500000000",
        passwordHash: await hashPassword("super123"),
        role: ROLES.SUPER_ADMIN,
        companyId: platform.id,
        active: true,
      },
    });
  } else if (existing.role !== ROLES.SUPER_ADMIN) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: ROLES.SUPER_ADMIN, companyId: platform.id, active: true },
    });
  }
}

export async function ensureDefaultUsers() {
  if (!allowDemoSeed()) return;
  await ensureSuperAdmin();

  let company = await prisma.company.findUnique({ where: { slug: "demo" } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        id: "cm_default_company_001",
        name: "חברת דוגמה",
        slug: "demo",
        approved: true,
        active: true,
      },
    });
  } else if (!company.approved) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { approved: true },
    });
  }

  const count = await prisma.user.count({
    where: { companyId: company.id, role: { not: ROLES.SUPER_ADMIN } },
  });
  if (count > 0) return;

  await prisma.user.createMany({
    data: [
      {
        name: "מנהל",
        email: "admin@inventory.local",
        phone: "972501111111",
        passwordHash: await hashPassword("admin123"),
        role: ROLES.ADMIN,
        companyId: company.id,
      },
      {
        name: "מחסנאי",
        email: "warehouse@inventory.local",
        phone: "972502222222",
        passwordHash: await hashPassword("wh123"),
        role: ROLES.WAREHOUSE,
        companyId: company.id,
      },
      {
        name: "צופה",
        email: "viewer@inventory.local",
        phone: "972503333333",
        passwordHash: await hashPassword("view123"),
        role: ROLES.VIEWER,
        companyId: company.id,
      },
    ],
  });
}
