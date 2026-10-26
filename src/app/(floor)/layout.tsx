import { requireTenant } from "@/lib/tenant";
import { canAdmin, canWrite } from "@/lib/auth";
import { FloorShell } from "@/components/floor-shell";
import { redirect } from "next/navigation";

export default async function FloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenant();
  if (!canWrite(session.role)) {
    redirect("/dashboard");
  }

  return (
    <FloorShell
      companyName={session.companyName}
      userName={session.name}
      showFullApp={canAdmin(session.role)}
    >
      {children}
    </FloorShell>
  );
}
