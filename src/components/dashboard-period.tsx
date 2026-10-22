"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const options = [
  { value: "today", label: "היום" },
  { value: "week", label: "שבוע" },
  { value: "month", label: "חודש" },
] as const;

export function DashboardPeriod() {
  const router = useRouter();
  const params = useSearchParams();
  const period = params.get("period") || "today";

  return (
    <div
      className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1"
      role="tablist"
      aria-label="תקופה"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={period === o.value}
          onClick={() => router.push(`/dashboard?period=${o.value}`)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
            period === o.value
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
