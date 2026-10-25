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
  ChevronDown,
  Boxes,
  ClipboardCheck,
  LineChart,
  SlidersHorizontal,
  ShoppingCart,
  FileSpreadsheet,
  Contact,
  Tags,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ROLE_LABELS, ROLES, Role } from "@/lib/constants";
import {
  CompanyModules,
  DEFAULT_MODULES,
  navHrefAllowed,
} from "@/lib/modules";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
};

const topLink: NavItem = {
  href: "/dashboard",
  label: "דשבורד",
  icon: LayoutDashboard,
};

const groups: NavGroup[] = [
  {
    id: "ops",
    label: "מלאי יומי",
    icon: Boxes,
    items: [
      { href: "/pick", label: "ניפוק", icon: PackageMinus },
      { href: "/orders", label: "הזמנות לקוח", icon: ShoppingCart },
      { href: "/customers", label: "לקוחות", icon: Contact },
      { href: "/price-lists", label: "מחירונים", icon: Tags },
      { href: "/returns", label: "החזרות", icon: Undo2 },
      { href: "/inbound", label: "קליטה מלאה", icon: PackagePlus },
      { href: "/purchases", label: "רכש / PO", icon: FileSpreadsheet },
      { href: "/scan", label: "סריקה", icon: ScanBarcode },
      { href: "/stock", label: "תנועות", icon: ArrowLeftRight },
    ],
  },
  {
    id: "fulfill",
    label: "ליקוט וספירה",
    icon: ClipboardCheck,
    items: [
      { href: "/picks", label: "ליקוט ותבניות", icon: ClipboardList },
      { href: "/counts", label: "ספירה", icon: Calculator },
    ],
  },
  {
    id: "catalog",
    label: "קטלוג",
    icon: Package,
    items: [
      { href: "/products", label: "מוצרים", icon: Package },
      { href: "/locations", label: "מיקומים", icon: MapPin },
      { href: "/tools", label: "ייבוא", icon: Wrench },
    ],
  },
  {
    id: "insights",
    label: "דוחות",
    icon: LineChart,
    items: [
      { href: "/reports", label: "דוחות", icon: BarChart3 },
      { href: "/export", label: "ייצוא", icon: Download },
    ],
  },
  {
    id: "system",
    label: "ניהול",
    icon: SlidersHorizontal,
    items: [
      { href: "/setup", label: "הגדרות", icon: Settings2 },
      { href: "/team", label: "עובדים", icon: Users, adminOnly: true },
      { href: "/audit", label: "Audit", icon: Shield, adminOnly: true },
      { href: "/help", label: "מרכז עזרה", icon: CircleHelp },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, items: NavItem[]) {
  return items.some((i) => isActive(pathname, i.href));
}

function DesktopDropdown({
  group,
  items,
}: {
  group: NavGroup;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = groupIsActive(pathname, items);
  const GroupIcon = group.icon;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
          active || open
            ? "bg-[var(--accent)] text-[var(--accent-fg)]"
            : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        )}
      >
        <GroupIcon className="h-3.5 w-3.5" />
        {group.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
          {items.map(({ href, label, icon: Icon }) => {
            const on = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  on
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileSection({
  group,
  items,
  onNavigate,
}: {
  group: NavGroup;
  items: NavItem[];
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = groupIsActive(pathname, items);
  const [open, setOpen] = useState(active);
  const GroupIcon = group.icon;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active, pathname]);

  if (items.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold",
          active
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : "text-[var(--foreground)]"
        )}
      >
        <span className="inline-flex items-center gap-2">
          <GroupIcon className="h-4 w-4" />
          {group.label}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ms-3 space-y-0.5 border-s border-[var(--border)] ps-2 py-1">
          {items.map(({ href, label, icon: Icon }) => {
            const on = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  on
                    ? "bg-[var(--surface-2)] font-medium text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    role: Role;
    companyName?: string;
  } | null>(null);
  const [modules, setModules] = useState<CompanyModules>(DEFAULT_MODULES);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setUser(d?.user || null);
        if (d?.modules) setModules(d.modules);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isAdmin = user?.role === ROLES.ADMIN;
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          (!i.adminOnly || isAdmin) && navHrefAllowed(i.href, modules)
      ),
    }))
    .filter((g) => g.items.length > 0);

  const dashActive = isActive(pathname, topLink.href);
  const DashIcon = topLink.icon;

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
              <div className="font-medium text-[var(--foreground)]">
                {user.name}
              </div>
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

      <nav className="mx-auto hidden max-w-7xl items-center gap-1 px-4 pb-3 lg:flex">
        <Link
          href={topLink.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
            dashActive
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          )}
        >
          <DashIcon className="h-3.5 w-3.5" />
          {topLink.label}
        </Link>
        {visibleGroups.map((g) => (
          <DesktopDropdown key={g.id} group={g} items={g.items} />
        ))}
      </nav>

      {open && (
        <nav className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 lg:hidden">
          <Link
            href={topLink.href}
            onClick={() => setOpen(false)}
            className={cn(
              "mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
              dashActive
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--foreground)]"
            )}
          >
            <DashIcon className="h-4 w-4" />
            {topLink.label}
          </Link>
          {visibleGroups.map((g) => (
            <MobileSection
              key={g.id}
              group={g}
              items={g.items}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      )}
    </header>
  );
}
