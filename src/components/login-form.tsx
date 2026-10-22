"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const next = params.get("next");
      if (data.user?.isSuperAdmin || data.user?.role === "SUPER_ADMIN") {
        router.push(next?.startsWith("/admin") ? next : "/admin");
      } else {
        router.push(next || "/dashboard");
      }
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
      className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
    >
      <div>
        <Label>אימייל</Label>
        <Input
          className="border-white/20 bg-white/10 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label>סיסמה</Label>
        <Input
          className="border-white/20 bg-white/10 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <Button
        type="submit"
        className="w-full bg-[#b8e06a] text-[#0b1613] hover:bg-[#c8eb84]"
        disabled={loading}
      >
        {loading ? "מתחבר..." : "כניסה"}
      </Button>
    </form>
  );
}
