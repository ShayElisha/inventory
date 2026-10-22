import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0b1613] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <Link href="/" className="mb-8 font-display text-3xl font-extrabold">
          מלאים
        </Link>
        <h1 className="text-2xl font-bold">התחברות למשתמש</h1>
        <p className="mt-2 text-sm text-white/60">
          כניסה לעובדי החברה. להרשמת ארגון חדש —{" "}
          <Link href="/register" className="text-[#b8e06a] underline">
            פתיחת חברה
          </Link>
          . מנהלי פלטפורמה מועברים אוטומטית ל־/admin.
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
