"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
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
        body: JSON.stringify({ identifier, password }),
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
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
    >
      <div>
        <Label>אימייל או טלפון</Label>
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
          placeholder="name@company.com או 050-0000000"
        />
      </div>
      <PasswordInput
        value={password}
        onChange={setPassword}
        required
        autoComplete="current-password"
        showStrength={false}
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" variant="lime" className="w-full" disabled={loading}>
        {loading ? "מתחבר..." : "כניסה"}
      </Button>
    </form>
  );
}
