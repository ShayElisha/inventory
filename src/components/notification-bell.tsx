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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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
        className="relative rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"
        aria-label="התראות"
      >
        <Bell className="h-5 w-5 text-slate-700" />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-900">התראות</span>
            <button
              type="button"
              onClick={markAll}
              className="text-xs text-teal-700 hover:underline"
            >
              סמן הכל כנקרא
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                אין התראות כרגע
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`border-b border-slate-50 px-4 py-3 ${
                  n.read ? "bg-white" : "bg-teal-50/40"
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
                    <div className="text-sm font-medium text-slate-900">{n.title}</div>
                    <div className="mt-0.5 text-xs text-slate-600">{n.body}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {formatDateTime(n.createdAt)}
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="w-full text-right"
                    onClick={() => markOne(n.id)}
                  >
                    <div className="text-sm font-medium text-slate-900">{n.title}</div>
                    <div className="mt-0.5 text-xs text-slate-600">{n.body}</div>
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
