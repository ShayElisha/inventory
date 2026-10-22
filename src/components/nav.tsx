"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  MapPin,
  ScanBarcode,
  PackageMinus,
  PackagePlus,
  Download,
  Settings2,
  Menu,
  X,
  ClipboardList,
  Calculator,
  BarChart3,
  Wrench,
  Shield,
  LogOut,
  Users,
  KeyRound,
  CircleHelp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ROLE_LABELS, ROLES, Role } from "@/lib/constants";

const links: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}[] = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { href: "/pick", label: "ניפוק", icon: PackageMinus },
  { href: "/inbound", label: "קליטה", icon: PackagePlus },
  { href: "/picks", label: "ליקוט", icon: ClipboardList },
  { href: "/counts", label: "ספירה", icon: Calculator },
  { href: "/products", label: "קטלוג", icon: Package },
  { href: "/reports", label: "דוחות", icon: BarChart3 },
  { href: "/tools", label: "ייבוא", icon: Wrench },
  { href: "/stock", label: "תנועות", icon: ArrowLeftRight },
  { href: "/locations", label: "מיקומים", icon: MapPin },
  { href: "/scan", label: "סריקה", icon: ScanBarcode },
  { href: "/audit", label: "Audit", icon: Shield, adminOnly: true },
  { href: "/team", label: "עובדים", icon: Users, adminOnly: true },
  { href: "/setup", label: "הגדרות", icon: Settings2 },
  { href: "/export", label: "ייצוא", icon: Download },
  { href: "/help", label: "עזרה", icon: CircleHelp },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    role: Role;
    companyName?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isAdmin = user?.role === ROLES.ADMIN;
  const visibleLinks = links.filter((l) => !l.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--nav)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo href="" size="sm" showWordmark={false} photo />
            <div className="hidden leading-tight sm:block">
              <div className="font-display text-sm font-bold text-[var(--foreground)]">
                Sfira
              </div>
              <div className="text-xs text-[var(--muted)]">
                {user?.companyName || "ניהול מלאי ולוגיסטיקה"}
              </div>
            </div>
          </Link>
        </div>

        <GlobalSearch />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {user && (
            <div className="hidden text-left text-xs sm:block">
              <div className="font-medium text-[var(--foreground)]">{user.name}</div>
              <div className="text-[var(--muted)]">
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
          )}
          <Link
            href="/account/password"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 hover:bg-[var(--surface-2)]"
            title="שינוי סיסמה"
          >
            <KeyRound className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 hover:bg-[var(--surface-2)]"
            title="יציאה"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="תפריט"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="mx-auto hidden max-w-7xl flex-wrap gap-1 px-4 pb-3 lg:flex">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {open && (
        <nav className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 lg:hidden">
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--foreground)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
