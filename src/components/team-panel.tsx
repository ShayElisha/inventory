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
import { COMPANY_ROLES, ROLE_LABELS, ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Pencil, Trash2, UserPlus, Check, X } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneDisplay?: string;
  role: string;
  active: boolean;
  createdAt: string;
};

export function TeamPanel({
  employees,
  currentUserId,
  canManage,
}: {
  employees: Employee[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(ROLES.WAREHOUSE);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");

  async function createEmployee(e: React.FormEvent) {
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
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShowCreate(false);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole(ROLES.WAREHOUSE);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(u: Employee) {
    setEditId(u.id);
    setEditName(u.name);
    setEditEmail(u.email || "");
    setEditPhone(u.phoneDisplay || u.phone || "");
    setEditRole(u.role);
    setEditPassword("");
  }

  async function saveEdit(id: string) {
    if (!editEmail.trim() && !editPhone.trim()) {
      setError("חייבים אימייל או טלפון");
      return;
    }
    if (editPassword) {
      const pwdError = validatePassword(editPassword);
      if (pwdError) {
        setError(pwdError);
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          role: editRole,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setEditId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(u: Employee) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/team/${u.id}`, {
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

  async function deleteEmployee(u: Employee) {
    if (!confirm(`למחוק את העובד ${u.name}?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/team/${u.id}`, { method: "DELETE" });
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

      {canManage && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setShowCreate((v) => !v)}>
            <UserPlus className="h-4 w-4" />
            {showCreate ? "סגור" : "הוסף עובד"}
          </Button>
        </div>
      )}

      {canManage && showCreate && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">עובד חדש</h2>
          <form
            onSubmit={createEmployee}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <Label>שם מלא</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
            <div className="sm:col-span-2">
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                showStrength
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={loading}>
                {loading ? "שומר..." : "צור עובד"}
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-[var(--muted)]">
            חובה למלא לפחות אימייל או טלפון — שניהם יכולים לשמש להתחברות.
          </p>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-right text-[var(--muted)]">
              <th className="p-3 font-medium">שם</th>
              <th className="p-3 font-medium">אימייל</th>
              <th className="p-3 font-medium">טלפון</th>
              <th className="p-3 font-medium">תפקיד</th>
              <th className="p-3 font-medium">סטטוס</th>
              <th className="p-3 font-medium">נוצר</th>
              {canManage && <th className="p-3 font-medium">פעולות</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)]">
                {editId === u.id ? (
                  <>
                    <td className="p-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      >
                        {COMPANY_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="p-2" colSpan={2}>
                      <PasswordInput
                        label="סיסמה חדשה (אופציונלי)"
                        value={editPassword}
                        onChange={setEditPassword}
                        showStrength={Boolean(editPassword)}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                          disabled={loading}
                          onClick={() => saveEdit(u.id)}
                          title="שמור"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"
                          onClick={() => setEditId(null)}
                          title="ביטול"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ms-2 text-xs text-[var(--muted)]">(את/ה)</span>
                      )}
                    </td>
                    <td className="p-3">{u.email || "—"}</td>
                    <td className="p-3">
                      {u.phoneDisplay || u.phone || "—"}
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
                    {canManage && (
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 hover:bg-[var(--surface-2)]"
                            title="עריכה"
                            onClick={() => startEdit(u)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={loading || u.id === currentUserId}
                            onClick={() => toggleActive(u)}
                          >
                            {u.active ? "השעה" : "הפעל"}
                          </Button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            title="מחיקה"
                            disabled={loading || u.id === currentUserId}
                            onClick={() => deleteEmployee(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="p-8 text-center text-[var(--muted)]"
                >
                  אין עובדים עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
