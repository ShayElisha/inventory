import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo href="/" size="lg" photo />
          <ThemeToggle />
        </div>
        <h1 className="font-display text-2xl font-bold">הרשמת חברה</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          יוצרים ארגון חדש ומנהל ראשי. אפשר להירשם ולהתחבר עם אימייל ו/או טלפון.
          הסיסמה: 8+ תווים, אות גדולה/קטנה, מספר ותו מיוחד.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          כבר רשומים?{" "}
          <Link href="/login" className="text-[var(--accent)] underline">
            התחברות למשתמש
          </Link>
        </p>
      </div>
    </div>
  );
}
