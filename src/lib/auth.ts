import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role, ROLES } from "@/lib/constants";

const COOKIE = "inventory_session";
const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET || "inventory-dev-secret-change-me"
  );

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
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
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
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
      email: String(payload.email),
      role: payload.role as Role,
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

export function canWrite(role: Role) {
  return role === ROLES.ADMIN || role === ROLES.WAREHOUSE;
}

export function canAdmin(role: Role) {
  return role === ROLES.ADMIN;
}

export async function ensureDefaultUsers() {
  const count = await prisma.user.count();
  if (count > 0) return;
  const passwordHash = await hashPassword("admin123");
  await prisma.user.createMany({
    data: [
      {
        name: "מנהל",
        email: "admin@inventory.local",
        passwordHash,
        role: ROLES.ADMIN,
      },
      {
        name: "מחסנאי",
        email: "warehouse@inventory.local",
        passwordHash: await hashPassword("wh123"),
        role: ROLES.WAREHOUSE,
      },
      {
        name: "צופה",
        email: "viewer@inventory.local",
        passwordHash: await hashPassword("view123"),
        role: ROLES.VIEWER,
      },
    ],
  });
}
