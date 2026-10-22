"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  { href: "/admin", label: "סקירה", icon: LayoutDashboard },
  { href: "/admin/companies", label: "חברות", icon: Building2 },
  { href: "/admin/users", label: "משתמשים", icon: Users },
];

export function AdminNav({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--ink)] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandLogo href="" size="sm" showWordmark={false} light photo />
            <div className="leading-tight">
              <div className="font-display text-sm font-bold">Sfira · סופר אדמין</div>
              <div className="text-xs text-white/50">ניהול פלטפורמה</div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active =
              l.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  active
                    ? "bg-white/10 text-[var(--lime)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="hidden text-xs text-white/60 sm:inline">{userName}</span>
          )}
          <ThemeToggle className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/15 p-2 hover:bg-white/10"
            title="יציאה"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="תפריט"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 py-2 md:hidden">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/5"
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
