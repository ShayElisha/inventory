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
} from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { ROLE_LABELS, Role } from "@/lib/constants";

const links = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
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
  { href: "/audit", label: "Audit", icon: Shield },
  { href: "/setup", label: "הגדרות", icon: Settings2 },
  { href: "/export", label: "ייצוא", icon: Download },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f7f6]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
              מל
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-bold text-slate-900">מערכת מלאי</div>
              <div className="text-xs text-slate-500">לוגיסטיקה ווריאציות</div>
            </div>
          </Link>
        </div>

        <GlobalSearch />

        <div className="flex items-center gap-2">
          <NotificationBell />
          {user && (
            <div className="hidden text-left text-xs sm:block">
              <div className="font-medium text-slate-800">{user.name}</div>
              <div className="text-slate-500">{ROLE_LABELS[user.role]}</div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"
            title="יציאה"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg border border-slate-300 bg-white p-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="תפריט"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="mx-auto hidden max-w-7xl flex-wrap gap-1 px-4 pb-3 lg:flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                active ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-2 lg:hidden">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-teal-50 text-teal-800" : "text-slate-700"
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
