import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const [
    companies,
    activeCompanies,
    users,
    products,
    variants,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count({ where: { slug: { not: "platform" } } }),
    prisma.company.count({ where: { slug: { not: "platform" }, active: true } }),
    prisma.user.count({ where: { role: { not: ROLES.SUPER_ADMIN } } }),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.company.findMany({
      where: { slug: { not: "platform" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { users: true, products: true } },
      },
    }),
  ]);

  return NextResponse.json({
    companies,
    activeCompanies,
    suspendedCompanies: companies - activeCompanies,
    users,
    products,
    variants,
    recentCompanies,
  });
}
