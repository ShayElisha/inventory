import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Mail, MapPin, Phone } from "lucide-react";

const product = [
  { href: "/register", label: "הרשמת חברה" },
  { href: "/login", label: "התחברות" },
  { href: "/dashboard", label: "כניסה למערכת" },
  { href: "/#advantages", label: "יתרונות" },
  { href: "/#how", label: "איך זה עובד" },
];

const company = [
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/#audience", label: "למי זה מתאים" },
  { href: "/#stats", label: "Sfira במספרים" },
];

const legal = [
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/terms", label: "תנאי שימוש" },
  { href: "/accessibility", label: "הצהרת נגישות" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#08110e] text-[#f3f7f4]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <BrandLogo href="/" size="lg" light photo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Sfira — פלטפורמת ניהול מלאי ולוגיסטיקה לחברות. אפשרויות מוצר, ליקוט,
              ספירות, דוחות וצוות — במערכת אחת לכל הארגון.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-white/55">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-[#b8e06a]" />
                <a
                  href="mailto:hello@sfira.app"
                  className="transition hover:text-white"
                >
                  hello@sfira.app
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[#b8e06a]" />
                <a href="tel:+972500000000" className="transition hover:text-white">
                  050-0000000
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b8e06a]" />
                <span>ישראל</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-display text-sm font-semibold tracking-wide text-[#b8e06a]">
              מוצר
            </h3>
            <ul className="mt-4 space-y-2.5">
              {product.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/65 transition hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-semibold tracking-wide text-[#b8e06a]">
              החברה
            </h3>
            <ul className="mt-4 space-y-2.5">
              {company.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/65 transition hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-semibold tracking-wide text-[#b8e06a]">
              משפטי ונגישות
            </h3>
            <ul className="mt-4 space-y-2.5">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/65 transition hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1 text-center sm:text-right">
            <p>
              © {year} Sfira. כל הזכויות שמורות לשי אלישע.
            </p>
            <p className="text-white/30">
              ניהול מלאי · לוגיסטיקה · אפשרויות מוצר · רב־חברתי
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
            <Link href="/privacy" className="transition hover:text-white/70">
              פרטיות
            </Link>
            <Link href="/terms" className="transition hover:text-white/70">
              תנאים
            </Link>
            <Link href="/accessibility" className="transition hover:text-white/70">
              נגישות
            </Link>
            <Link href="/about" className="transition hover:text-white/70">
              אודות
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
