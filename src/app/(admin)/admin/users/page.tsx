import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { AdminUsers } from "@/components/admin-users";
import { ROLES } from "@/lib/constants";

export default async function AdminUsersPage() {
  noStore();
  await requireSuperAdmin();

  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: ROLES.SUPER_ADMIN } },
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: { id: true, name: true, slug: true, active: true },
        },
      },
    }),
    prisma.company.findMany({
      where: { slug: { not: "platform" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="ניהול משתמשים"
        description="כל משתמשי החברות בפלטפורמה"
      />
      <AdminUsers
        users={JSON.parse(JSON.stringify(users))}
        companies={companies}
      />
    </div>
  );
}
