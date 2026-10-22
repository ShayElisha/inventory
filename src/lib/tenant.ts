import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { destroySession, getSession, isSuperAdmin, SessionUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function requireTenant(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");
  if (isSuperAdmin(session.role)) redirect("/admin");

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { approved: true, active: true },
  });
  if (!company?.approved || !company.active) {
    await destroySession();
    redirect("/login?pending=1");
  }

  return session;
}

export async function requireCompanyAdmin(): Promise<SessionUser> {
  const session = await requireTenant();
  if (session.role !== ROLES.ADMIN) redirect("/dashboard");
  return session;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.SUPER_ADMIN) redirect("/dashboard");
  return session;
}
