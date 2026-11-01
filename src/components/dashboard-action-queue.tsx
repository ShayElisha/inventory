"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/lib/action-queue";

export function DashboardActionQueue({ items }: { items: ActionItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  async function createPoNow() {
    setLoading(true);
    setError("");
    setToast("");
    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-po" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setToast(data.message || "נוצרו הזמנות רכש");
      router.refresh();
      router.push("/purchases");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  if (!items.length) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">מה לעשות עכשיו</h2>
        <span className="text-xs text-[var(--muted)]">
          {items.length} משימות פעולה
        </span>
      </div>
      {(toast || error) && (
        <p
          className={cn(
            "mb-3 rounded-lg px-3 py-2 text-sm",
            error
              ? "bg-[var(--danger-soft)] text-[var(--danger)]"
              : "bg-[var(--ok-soft,theme(colors.emerald.50))] text-[var(--ok)]"
          )}
        >
          {error || toast}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <div
            key={a.id}
            className={cn(
              "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]",
              a.tone === "danger" && "border-[var(--danger)]/25",
              a.tone === "warn" && "border-[var(--warn)]/30",
              a.tone === "accent" && "border-[var(--accent)]/25"
            )}
          >
            <p className="font-display text-sm font-semibold">{a.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{a.detail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.id === "reorder" ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => createPoNow()}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {loading ? "יוצר…" : "צור PO עכשיו"}
                </button>
              ) : null}
              <Link
                href={a.href}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--surface-2)]"
              >
                {a.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
