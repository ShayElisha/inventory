"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, phone, adminName, email, password }),
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div>
        <Label>שם החברה</Label>
        <Input
          className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          placeholder="למשל: לוגיסטיקה בע״מ"
        />
      </div>
      <div>
        <Label>טלפון (אופציונלי)</Label>
        <Input
          className="border-white/20 bg-white/10 text-white"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-0000000"
        />
      </div>
      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-xs text-white/50">פרטי מנהל ראשי</p>
        <div className="space-y-3">
          <div>
            <Label>שם מלא</Label>
            <Input
              className="border-white/20 bg-white/10 text-white"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>אימייל להתחברות</Label>
            <Input
              className="border-white/20 bg-white/10 text-white"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>סיסמה</Label>
            <Input
              className="border-white/20 bg-white/10 text-white"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <Button
        type="submit"
        className="w-full bg-[#b8e06a] text-[#0b1613] hover:bg-[#c8eb84]"
        disabled={loading}
      >
        {loading ? "יוצרים חברה..." : "צור חברה והתחל"}
      </Button>
    </form>
  );
}
