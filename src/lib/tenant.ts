import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { destroySession, getSession, isSuperAdmin, SessionUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  CompanyModules,
  modulesFromCompany,
  SellableModuleId,
  SELLABLE_MODULES,
} from "@/lib/modules";

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

export async function getCompanyModules(
  companyId: string
): Promise<CompanyModules> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      modInbound: true,
      modSales: true,
      modPick: true,
      modCommerce: true,
      modReturns: true,
    },
  });
  return modulesFromCompany(company || {});
}

/** חוסם עמוד אם המודול כבוי לחברה */
export async function requireModule(moduleId: SellableModuleId) {
  const session = await requireTenant();
  const modules = await getCompanyModules(session.companyId);
  if (!modules[moduleId]) {
    redirect("/dashboard?module=off");
  }
  return { session, modules };
}

/** לשימוש ב־API — מחזיר Response אם המודול כבוי */
export async function assertModuleApi(moduleId: SellableModuleId) {
  const session = await getSession();
  if (!session?.companyId) {
    return {
      session: null,
      error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }),
    };
  }
  const modules = await getCompanyModules(session.companyId);
  if (!modules[moduleId]) {
    const label =
      SELLABLE_MODULES.find((m) => m.id === moduleId)?.label || moduleId;
    return {
      session,
      error: NextResponse.json(
        { error: `מודול «${label}» אינו פעיל לחברה זו`, code: "MODULE_OFF" },
        { status: 403 }
      ),
    };
  }
  return { session, error: null as null };
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
