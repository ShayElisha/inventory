"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  MapPin,
  ScanBarcode,
  PackageMinus,
  Download,
  Settings2,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/pick", label: "ניפוק", icon: PackageMinus },
  { href: "/products", label: "קטלוג", icon: Package },
  { href: "/stock", label: "תנועות", icon: ArrowLeftRight },
  { href: "/locations", label: "מיקומים", icon: MapPin },
  { href: "/scan", label: "סריקה", icon: ScanBarcode },
  { href: "/setup", label: "הגדרות", icon: Settings2 },
  { href: "/export", label: "ייצוא", icon: Download },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f7f6]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
              מל
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">מערכת מלאי</div>
              <div className="text-xs text-slate-500">לוגיסטיקה ווריאציות</div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-teal-700 text-white"
                    : "text-slate-700 hover:bg-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          className="rounded-lg border border-slate-300 bg-white p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="תפריט"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-2 md:hidden">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
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
