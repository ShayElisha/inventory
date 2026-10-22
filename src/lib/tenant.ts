import { redirect } from "next/navigation";
import { getSession, isSuperAdmin, SessionUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function requireTenant(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  if (isSuperAdmin(session.role)) redirect("/admin");
  return session;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.SUPER_ADMIN) redirect("/dashboard");
  return session;
}
