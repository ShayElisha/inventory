"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@inventory.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.push(params.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <div>
          <h1 className="text-2xl font-bold">התחברות</h1>
          <p className="mt-1 text-sm text-slate-500">מנהל / מחסנאי / צופה</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>אימייל</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <Label>סיסמה</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "מתחבר..." : "כניסה"}
          </Button>
        </form>
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <div>admin@inventory.local / admin123</div>
          <div>warehouse@inventory.local / wh123</div>
          <div>viewer@inventory.local / view123</div>
        </div>
      </Card>
    </div>
  );
}
