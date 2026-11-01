import { unstable_noStore as noStore } from "next/cache";
import { PageHeader } from "@/components/ui";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { canAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
  noStore();
  const session = await requireSession();
  const user = await prisma.user.findFirst({
    where: { id: session.id },
    select: { permissionsJson: true },
  });
  if (
    !canAdmin(session.role) &&
    !hasPermission(session.role, "integrations.manage", user?.permissionsJson)
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="אינטגרציות"
        description="API keys · Webhooks · Shopify"
      />
      <IntegrationsPanel />
    </div>
  );
}
