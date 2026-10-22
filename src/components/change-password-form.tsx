"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { validatePassword } from "@/lib/password";

export function ChangePasswordForm({
  forced = false,
}: {
  forced?: boolean;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("הסיסמאות החדשות אינן תואמות");
      return;
    }
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSuccess("הסיסמה עודכנה בהצלחה");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (forced) {
        const role = data.user?.role;
        router.push(role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
        router.refresh();
      } else {
        router.refresh();
      }
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
      {forced && (
        <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
          התחברתם עם סיסמה זמנית. יש לבחור סיסמה חדשה כדי להמשיך במערכת.
        </div>
      )}
      <PasswordInput
        id="current-password"
        label="סיסמה נוכחית"
        value={currentPassword}
        onChange={setCurrentPassword}
        required
        showStrength={false}
        autoComplete="current-password"
      />
      <PasswordInput
        id="new-password"
        label="סיסמה חדשה"
        value={newPassword}
        onChange={setNewPassword}
        required
        showStrength
        autoComplete="new-password"
      />
      <PasswordInput
        id="confirm-password"
        label="אימות סיסמה חדשה"
        value={confirmPassword}
        onChange={setConfirmPassword}
        required
        showStrength={false}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {success && !forced && (
        <p className="text-sm text-[var(--ok)]">{success}</p>
      )}
      <Button type="submit" variant="lime" className="w-full" disabled={loading}>
        {loading ? "שומר..." : forced ? "שמור והמשך" : "עדכן סיסמה"}
      </Button>
    </form>
  );
}
