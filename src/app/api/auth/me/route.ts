import { NextResponse } from "next/server";
import { getSession, ensureDefaultUsers, isSuperAdmin } from "@/lib/auth";
import { getCompanyModules } from "@/lib/tenant";
import { DEFAULT_MODULES } from "@/lib/modules";

export async function GET() {
  await ensureDefaultUsers();
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const modules =
    session.companyId && !isSuperAdmin(session.role)
      ? await getCompanyModules(session.companyId)
      : DEFAULT_MODULES;

  return NextResponse.json({ user: session, modules });
}
