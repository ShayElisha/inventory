"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CompanyModules,
  DEFAULT_MODULES,
  isModuleEnabled,
} from "@/lib/modules";
import {
  SECTION_TAB_SETS,
  SectionId,
  SectionTab,
} from "@/lib/section-nav";

/** התאמה מדויקת — מונע ש־/pick ייתפס כפעיל גם ב־/picks */
function isTabActive(pathname: string, href: string) {
  if (pathname === href) return true;
  // תתי־דפים (למשל /documents/123, /picks/abc) — רק אם זה באמת ילד של אותו נתיב
  if (!pathname.startsWith(`${href}/`)) return false;
  // הגנה נוספת: /pick לא יתאים ל־/picks/...
  const nextChar = pathname.charAt(href.length);
  return nextChar === "/";
}

export function SectionTabs({
  section,
  tabs: tabsProp,
  className,
}: {
  section?: SectionId;
  tabs?: SectionTab[];
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [modules, setModules] = useState<CompanyModules>(DEFAULT_MODULES);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) return null;
        const text = await r.text();
        if (!text.trim()) return null;
        try {
          return JSON.parse(text) as { modules?: CompanyModules };
        } catch {
          return null;
        }
      })
      .then((d) => {
        if (d?.modules) setModules(d.modules);
      })
      .catch(() => {});
  }, []);

  const source = tabsProp ?? (section ? SECTION_TAB_SETS[section] : []);
  const tabs = source.filter(
    (t) => !t.module || isModuleEnabled(modules, t.module)
  );

  if (tabs.length < 2) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5",
        className
      )}
      role="tablist"
      aria-label="מעבר בין חלקים"
    >
      {tabs.map((tab) => {
        const on = isTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={on}
            prefetch={false}
            onClick={(e) => {
              e.preventDefault();
              if (pathname !== tab.href) {
                router.push(tab.href);
              }
            }}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition",
              on
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
