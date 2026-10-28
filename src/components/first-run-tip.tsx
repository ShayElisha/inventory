"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** מדריך קצר שמופיע פעם אחת במסך */
export function FirstRunTip({
  tipId,
  title,
  children,
}: {
  tipId: string;
  title: string;
  children: React.ReactNode;
}) {
  const storageKey = `sfira-tip-${tipId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="relative rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
      <button
        type="button"
        onClick={dismiss}
        className="absolute start-3 top-3 rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
        aria-label="סגור"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pe-8 font-semibold text-[var(--foreground)]">{title}</p>
      <div className="mt-1 space-y-1 text-[var(--muted)]">{children}</div>
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 text-xs font-medium text-[var(--accent)] underline"
      >
        הבנתי, אל תציג שוב
      </button>
    </div>
  );
}
