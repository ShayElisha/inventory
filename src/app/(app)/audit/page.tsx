import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { requireCompanyAdmin } from "@/lib/tenant";

export default async function AuditPage() {
  noStore();
  const session = await requireCompanyAdmin();
  const logs = await prisma.auditLog.findMany({
    where: { user: { companyId: session.companyId } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="יומן פעילות"
        description="מי · מתי · מה · IP — תיעוד בלתי משתנה של פעולות"
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-right text-[var(--muted)]">
              <th className="p-3">זמן</th>
              <th className="p-3">משתמש</th>
              <th className="p-3">פעולה</th>
              <th className="p-3">ישות</th>
              <th className="p-3">IP</th>
              <th className="p-3">פרטים</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-[var(--border)]">
                <td className="p-3 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                <td className="p-3">{l.user?.name ?? "—"}</td>
                <td className="p-3 font-medium">{l.action}</td>
                <td className="p-3">
                  {l.entityType}
                  {l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""}
                </td>
                <td className="p-3 font-mono text-xs">{l.ip ?? "—"}</td>
                <td className="p-3 max-w-xs truncate text-xs text-[var(--muted)]">
                  {l.details}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--muted)]">
                  אין רשומות עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
