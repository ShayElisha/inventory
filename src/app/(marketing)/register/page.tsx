import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0b1613] text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <Link href="/" className="mb-8 font-display text-3xl font-extrabold text-white">
          מלאים
        </Link>
        <h1 className="text-2xl font-bold">הרשמת חברה</h1>
        <p className="mt-2 text-sm text-white/60">
          יוצרים ארגון חדש ומנהל ראשי. אחר כך אפשר להוסיף משתמשים מהצוות.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
        <p className="mt-6 text-sm text-white/50">
          כבר רשומים?{" "}
          <Link href="/login" className="text-[#b8e06a] underline">
            התחברות למשתמש
          </Link>
        </p>
      </div>
    </div>
  );
}
