import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const product = [
  { href: "/register", label: "הרשמת חברה" },
  { href: "/login", label: "התחברות" },
  { href: "/dashboard", label: "כניסה למערכת" },
];

const features = [
  { href: "/#stats", label: "Sfira במספרים" },
  { href: "/#advantages", label: "יתרונות" },
  { href: "/#how", label: "איך זה עובד" },
  { href: "/#audience", label: "למי זה מתאים" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#08110e] text-[#f3f7f4]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <BrandLogo href="/" size="lg" light photo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            פלטפורמת ניהול מלאי ולוגיסטיקה לחברות — וריאציות, ליקוט, ספירות,
            דוחות וצוות, במערכת אחת.
          </p>
        </div>

        <div className="md:col-span-3">
          <h3 className="font-display text-sm font-semibold tracking-wide text-[#b8e06a]">
            מוצר
          </h3>
          <ul className="mt-4 space-y-2.5">
            {product.map((l) => (
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

        <div className="md:col-span-4">
          <h3 className="font-display text-sm font-semibold tracking-wide text-[#b8e06a]">
            בדף הראשי
          </h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-1">
            {features.map((l) => (
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

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-white/40 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Sfira. כל הזכויות שמורות.</p>
          <p>ניהול מלאי · לוגיסטיקה · וריאציות</p>
        </div>
      </div>
    </footer>
  );
}
