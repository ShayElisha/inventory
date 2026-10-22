import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo href="/" size="lg" photo />
          <ThemeToggle />
        </div>
        <h1 className="font-display text-2xl font-bold">התחברות למשתמש</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          כניסה עם אימייל או טלפון. להרשמת ארגון חדש —{" "}
          <Link href="/register" className="text-[var(--accent)] underline">
            פתיחת חברה
          </Link>
          .
        </p>
        <div className="mt-8">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
