"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { validatePassword } from "@/lib/password";
import { formatDateTime } from "@/lib/utils";
import { Pencil, Trash2, Ban, CheckCircle2 } from "lucide-react";

type Company = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  _count: {
    users: number;
    products: number;
    locations: number;
    categories: number;
  };
};

export function AdminCompanies({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !adminPhone.trim()) {
      setError("נא למלא אימייל או טלפון למנהל");
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
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          adminName,
          email,
          adminPhone,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShowCreate(false);
      setName("");
      setPhone("");
      setAdminName("");
      setEmail("");
      setAdminPhone("");
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(c: Company) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/companies/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
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

  async function deleteCompany(c: Company) {
    if (
      !confirm(
        `למחוק לצמיתות את "${c.name}" ואת כל הנתונים שלה (משתמשים, מוצרים, מלאי)?`
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/companies/${c.id}`, {
        method: "DELETE",
      });
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

      <div className="flex justify-end">
        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "סגור טופס" : "חברה חדשה"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">פתיחת חברה + מנהל</h2>
          <form
            onSubmit={createCompany}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div>
              <Label>שם החברה</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>שם מנהל</Label>
              <Input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>אימייל מנהל</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="אופציונלי אם יש טלפון"
              />
            </div>
            <div>
              <Label>טלפון מנהל</Label>
              <Input
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="050-0000000"
              />
            </div>
            <PasswordInput
              label="סיסמת מנהל"
              value={password}
              onChange={setPassword}
              required
              showStrength
            />
            <div className="flex items-end">
              <Button type="submit" disabled={loading}>
                {loading ? "יוצרים..." : "צור חברה"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-right text-[var(--muted)]">
              <th className="p-3 font-medium">חברה</th>
              <th className="p-3 font-medium">סטטוס</th>
              <th className="p-3 font-medium">משתמשים</th>
              <th className="p-3 font-medium">מוצרים</th>
              <th className="p-3 font-medium">מיקומים</th>
              <th className="p-3 font-medium">נוצר</th>
              <th className="p-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)]">
                <td className="p-3">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">{c.slug}</div>
                  {c.phone && (
                    <div className="text-xs text-[var(--muted)]">{c.phone}</div>
                  )}
                </td>
                <td className="p-3">
                  <Badge tone={c.active ? "ok" : "danger"}>
                    {c.active ? "פעילה" : "מושעית"}
                  </Badge>
                </td>
                <td className="p-3">{c._count.users}</td>
                <td className="p-3">{c._count.products}</td>
                <td className="p-3">{c._count.locations}</td>
                <td className="p-3 text-[var(--muted)]">
                  {formatDateTime(c.createdAt)}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                      title="עריכה"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-50"
                      title={c.active ? "השעיה" : "הפעלה"}
                      disabled={loading}
                      onClick={() => toggleActive(c)}
                    >
                      {c.active ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      title="מחיקה"
                      disabled={loading}
                      onClick={() => deleteCompany(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[var(--muted)]">
                  אין חברות רשומות
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
