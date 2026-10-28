"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 hover:bg-[var(--surface-2)]"
        aria-label="התראות"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-[var(--foreground)]" />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-x-3 top-16 z-[60] max-h-[min(24rem,calc(100dvh-5rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-h-96"
          role="dialog"
          aria-label="התראות"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
            <span className="font-semibold text-[var(--foreground)]">
              התראות
            </span>
            <button
              type="button"
              onClick={markAll}
              className="shrink-0 text-xs text-[var(--accent)] hover:underline"
            >
              סמן הכל כנקרא
            </button>
          </div>
          <ul className="max-h-[min(20rem,calc(100dvh-8rem))] overflow-y-auto overscroll-contain sm:max-h-80">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                אין התראות כרגע
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`border-b border-[var(--border)] px-4 py-3 ${
                  n.read ? "bg-[var(--surface)]" : "bg-[var(--accent-soft)]/40"
                }`}
              >
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => {
                      markOne(n.id);
                      setOpen(false);
                    }}
                    className="block"
                  >
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {n.title}
                    </div>
                    <div className="mt-0.5 break-words text-xs text-[var(--muted)]">
                      {n.body}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--muted)]">
                      {formatDateTime(n.createdAt)}
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="w-full text-right"
                    onClick={() => markOne(n.id)}
                  >
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {n.title}
                    </div>
                    <div className="mt-0.5 break-words text-xs text-[var(--muted)]">
                      {n.body}
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
