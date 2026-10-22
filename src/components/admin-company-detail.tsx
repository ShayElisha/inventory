"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { validatePassword } from "@/lib/password";
import { ROLE_LABELS, COMPANY_ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
};

type Company = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  users: UserRow[];
  _count: {
    products: number;
    locations: number;
    categories: number;
    suppliers: number;
    pickLists: number;
    stockCounts: number;
  };
};

export function AdminCompanyDetail({ company }: { company: Company }) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [slug, setSlug] = useState(company.slug);
  const [phone, setPhone] = useState(company.phone || "");
  const [active, setActive] = useState(company.active);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPhone, setUPhone] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<string>("WAREHOUSE");

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, phone, active }),
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

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (!uEmail.trim() && !uPhone.trim()) {
      setError("נא למלא אימייל או טלפון");
      return;
    }
    const pwdError = validatePassword(uPassword);
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
        body: JSON.stringify({
          companyId: company.id,
          name: uName,
          email: uEmail,
          phone: uPhone,
          password: uPassword,
          role: uRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setUName("");
      setUEmail("");
      setUPhone("");
      setUPassword("");
      setURole("WAREHOUSE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(u: UserRow) {
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

  async function changeRole(u: UserRow, role: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
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
    if (!confirm(`למחוק את המשתמש ${u.email}?`)) return;
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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["מוצרים", company._count.products],
          ["קטגוריות", company._count.categories],
          ["ספקים", company._count.suppliers],
          ["מיקומים", company._count.locations],
          ["ליקוטים", company._count.pickLists],
          ["ספירות", company._count.stockCounts],
        ].map(([label, value]) => (
          <Card key={String(label)} className="py-3">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">פרטי חברה</h2>
        <form onSubmit={saveCompany} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>שם</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
          <div>
            <Label>טלפון</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              חברה פעילה
            </label>
            <Badge tone={active ? "ok" : "danger"}>
              {active ? "פעילה" : "מושעית"}
            </Badge>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-3 text-xs text-[var(--muted)]">
              נוצרה: {formatDateTime(company.createdAt)}
            </p>
            <Button type="submit" disabled={loading}>
              שמור שינויים
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">משתמשי החברה</h2>
        <form
          onSubmit={addUser}
          className="mb-6 grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div>
            <Label>שם</Label>
            <Input value={uName} onChange={(e) => setUName(e.target.value)} required />
          </div>
          <div>
            <Label>אימייל</Label>
            <Input
              type="email"
              value={uEmail}
              onChange={(e) => setUEmail(e.target.value)}
              placeholder="אופציונלי אם יש טלפון"
            />
          </div>
          <div>
            <Label>טלפון</Label>
            <Input
              value={uPhone}
              onChange={(e) => setUPhone(e.target.value)}
              placeholder="050-0000000"
            />
          </div>
          <PasswordInput
            value={uPassword}
            onChange={setUPassword}
            required
            showStrength
          />
          <div>
            <Label>תפקיד</Label>
            <Select value={uRole} onChange={(e) => setURole(e.target.value)}>
              {COMPANY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading} className="w-full">
              הוסף משתמש
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-right text-[var(--muted)]">
                <th className="pb-2 font-medium">שם</th>
                <th className="pb-2 font-medium">אימייל</th>
                <th className="pb-2 font-medium">תפקיד</th>
                <th className="pb-2 font-medium">סטטוס</th>
                <th className="pb-2 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {company.users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)]">
                  <td className="py-2.5 font-medium">{u.name}</td>
                  <td className="py-2.5">{u.email}</td>
                  <td className="py-2.5">
                    <Select
                      className="w-auto min-w-[120px]"
                      value={u.role}
                      disabled={loading}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {COMPANY_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-2.5">
                    <Badge tone={u.active ? "ok" : "danger"}>
                      {u.active ? "פעיל" : "מושעה"}
                    </Badge>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={loading}
                        onClick={() => toggleUser(u)}
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
              {company.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--muted)]">
                    אין משתמשים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
