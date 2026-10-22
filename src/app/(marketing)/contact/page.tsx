import { LegalPageShell } from "@/components/legal-page";
import Link from "next/link";

export const metadata = {
  title: "צור קשר | Sfira",
  description: "יצירת קשר עם צוות Sfira",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      title="צור קשר"
      description="נשמח לעזור בנושאי מוצר, הרשמה, תמיכה או שיתופי פעולה."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-semibold">כללי</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            שאלות על המוצר והרשמת חברה
          </p>
          <a
            href="mailto:hello@sfira.app"
            className="mt-3 inline-block text-[var(--accent)] underline"
          >
            hello@sfira.app
          </a>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-semibold">פרטיות</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            בקשות מידע ומדיניות פרטיות
          </p>
          <a
            href="mailto:privacy@sfira.app"
            className="mt-3 inline-block text-[var(--accent)] underline"
          >
            privacy@sfira.app
          </a>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-semibold">משפטי</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">תנאי שימוש וזכויות</p>
          <a
            href="mailto:legal@sfira.app"
            className="mt-3 inline-block text-[var(--accent)] underline"
          >
            legal@sfira.app
          </a>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-display text-lg font-semibold">נגישות</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">דיווח על חסמי נגישות</p>
          <a
            href="mailto:accessibility@sfira.app"
            className="mt-3 inline-block text-[var(--accent)] underline"
          >
            accessibility@sfira.app
          </a>
        </div>
      </div>

      <p className="!mt-8">
        כבר יש לכם חברה?{" "}
        <Link href="/login" className="text-[var(--accent)] underline">
          התחברות
        </Link>
        {" · "}
        רוצים להצטרף?{" "}
        <Link href="/register" className="text-[var(--accent)] underline">
          הרשמת חברה
        </Link>
      </p>
      <p className="text-sm text-[var(--muted)]">
        Sfira · כל הזכויות שמורות לשי אלישע
      </p>
    </LegalPageShell>
  );
}
