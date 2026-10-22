import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function LegalPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo href="/" size="md" photo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              לדף הראשי
            </Link>
          </div>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base text-[var(--muted)]">{description}</p>
        )}
        <div className="legal-prose mt-10 space-y-4 text-sm leading-relaxed text-[var(--foreground)]/90 sm:text-base">
          {children}
        </div>
        <p className="mt-12 text-xs text-[var(--muted)]">
          עודכן לאחרונה: אוקטובר 2026 · Sfira · כל הזכויות שמורות לשי אלישע
        </p>
      </article>
    </div>
  );
}
