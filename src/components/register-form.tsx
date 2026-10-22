"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { validatePassword } from "@/lib/password";

export function RegisterForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !adminPhone.trim()) {
      setError("נא למלא אימייל או טלפון להתחברות (לפחות אחד)");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyPhone,
          adminName,
          email,
          adminPhone,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בהרשמה");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
    >
      <div>
        <Label>שם החברה</Label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          placeholder="למשל: לוגיסטיקה בע״מ"
        />
      </div>
      <div>
        <Label>טלפון חברה (אופציונלי)</Label>
        <Input
          value={companyPhone}
          onChange={(e) => setCompanyPhone(e.target.value)}
          placeholder="03-0000000"
        />
      </div>
      <div className="border-t border-[var(--border)] pt-4">
        <p className="mb-3 text-xs text-[var(--muted)]">
          פרטי מנהל ראשי — התחברות באימייל ו/או בטלפון
        </p>
        <div className="space-y-3">
          <div>
            <Label>שם מלא</Label>
            <Input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
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
              autoComplete="email"
            />
          </div>
          <div>
            <Label>טלפון אישי</Label>
            <Input
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="050-0000000"
              autoComplete="tel"
            />
          </div>
          <PasswordInput
            value={password}
            onChange={setPassword}
            required
            showStrength
            autoComplete="new-password"
          />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" variant="lime" className="w-full" disabled={loading}>
        {loading ? "יוצרים חברה..." : "צור חברה והתחל"}
      </Button>
    </form>
  );
}
