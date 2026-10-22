import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TeamPanel } from "@/components/team-panel";
import { requireTenant } from "@/lib/tenant";
import { ROLES } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/contact";
import { canAdmin } from "@/lib/auth";

export default async function TeamPage() {
  noStore();
  const session = await requireTenant();

  const employees = await prisma.user.findMany({
    where: {
      companyId: session.companyId,
      role: { not: ROLES.SUPER_ADMIN },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  const manage = canAdmin(session.role);

  return (
    <div>
      <PageHeader
        title="עובדים"
        description={
          manage
            ? "הוספה, עריכה והשעיה של משתמשי החברה — התחברות באימייל או בטלפון"
            : "רשימת עובדי החברה"
        }
      />
      <TeamPanel
        employees={JSON.parse(
          JSON.stringify(
            employees.map((u) => ({
              ...u,
              phoneDisplay: formatPhoneDisplay(u.phone),
            }))
          )
        )}
        currentUserId={session.id}
        canManage={manage}
      />
    </div>
  );
}
