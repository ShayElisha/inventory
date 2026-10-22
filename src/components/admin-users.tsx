"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { validatePassword } from "@/lib/password";
import { COMPANY_ROLES, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  company: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
  };
};

type CompanyOpt = { id: string; name: string };

export function AdminUsers({
  users,
  companies,
}: {
  users: UserRow[];
  companies: CompanyOpt[];
}) {
  const router = useRouter();
  const [filterCompany, setFilterCompany] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("WAREHOUSE");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterCompany && u.company.id !== filterCompany) return false;
      if (!q.trim()) return true;
      const s = q.trim().toLowerCase();
      return (
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.company.name.toLowerCase().includes(s)
      );
    });
  }, [users, filterCompany, q]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setError("נא למלא אימייל או טלפון");
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, name, email, phone, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShowCreate(false);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(u: UserRow) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !u.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`למחוק את ${u.email}?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <Card className="flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-1">
          <Input
            placeholder="חיפוש שם / אימייל / חברה"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="min-w-[160px]">
          <Select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
          >
            <option value="">כל החברות</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "סגור" : "משתמש חדש"}
        </Button>
      </Card>

      {showCreate && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">הוספת משתמש לחברה</h2>
          <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>חברה</Label>
              <Select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>שם</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="אופציונלי אם יש טלפון"
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
              />
            </div>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              showStrength
            />
            <div>
              <Label>תפקיד</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {COMPANY_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || !companyId}>
                צור משתמש
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-right text-[var(--muted)]">
              <th className="p-3 font-medium">משתמש</th>
              <th className="p-3 font-medium">חברה</th>
              <th className="p-3 font-medium">תפקיד</th>
              <th className="p-3 font-medium">סטטוס</th>
              <th className="p-3 font-medium">נוצר</th>
              <th className="p-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)]">
                <td className="p-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-[var(--muted)]">{u.email}</div>
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/companies/${u.company.id}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    {u.company.name}
                  </Link>
                  {!u.company.active && (
                    <Badge tone="danger">חברה מושעית</Badge>
                  )}
                </td>
                <td className="p-3">
                  {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                </td>
                <td className="p-3">
                  <Badge tone={u.active ? "ok" : "danger"}>
                    {u.active ? "פעיל" : "מושעה"}
                  </Badge>
                </td>
                <td className="p-3 text-[var(--muted)]">
                  {formatDateTime(u.createdAt)}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active ? "השעה" : "הפעל"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={loading}
                      onClick={() => deleteUser(u)}
                    >
                      מחק
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--muted)]">
                  לא נמצאו משתמשים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
