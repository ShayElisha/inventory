"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  PackagePlus,
  MapPin,
  PackageMinus,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

const tabs = [
  { href: "/floor", label: "בית", icon: Home, exact: true },
  { href: "/floor/receive", label: "קליטה", icon: PackagePlus },
  { href: "/floor/shelf", label: "מדף", icon: MapPin },
  { href: "/floor/pick", label: "ניפוק", icon: PackageMinus },
];

export function FloorShell({
  children,
  companyName,
  userName,
  showFullApp,
}: {
  children: React.ReactNode;
  companyName: string;
  userName: string;
  showFullApp?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{companyName}</p>
            <p className="truncate text-xs text-[var(--muted)]">
              רצפת מחסן · {userName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showFullApp && (
              <Link
                href="/dashboard"
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                title="מערכת מלאה"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"
              title="יציאה"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-28">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium transition",
                  active
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
