import { LegalPageShell } from "@/components/legal-page";

export const metadata = {
  title: "אודות | Sfira",
  description: "מי אנחנו — פלטפורמת Sfira לניהול מלאי ולוגיסטיקה",
};

export default function AboutPage() {
  return (
    <LegalPageShell
      title="אודות Sfira"
      description="פלטפורמה לניהול מלאי, לוגיסטיקה ואפשרויות מוצר — שנבנתה לקצב של מחסן אמיתי."
    >
      <p>
        Sfira היא מערכת לניהול מלאי רב־חברתי: כל ארגון מקבל סביבה מופרדת, עם
        קטלוג, אפשרויות מוצר, קליטה וניפוק, ליקוט, ספירות שטח, דוחות והרשאות לפי
        תפקיד.
      </p>
      <p>
        המערכת מיועדת למחסנים, קמעונאות, אופנה עם מטריצות מידה/צבע, וייצור —
        מהמסופון בשטח ועד הדשבורד במשרד.
      </p>
      <h2 className="!mt-8 font-display text-xl font-semibold">החזון</h2>
      <p>
        להפוך ניהול מלאי מדויק לפשוט וזמין לכל צוות — בלי גיליונות אלקטרוניים
        מפוזרים ובלי טעויות הקלדה בין מדף לדוח.
      </p>
      <h2 className="!mt-8 font-display text-xl font-semibold">יוצר</h2>
      <p>
        Sfira פותחה על ידי שי אלישע. כל הזכויות שמורות לשי אלישע.
      </p>
      <p>
        לשאלות, שיתופי פעולה או תמיכה —{" "}
        <a href="/contact" className="text-[var(--accent)] underline">
          צרו קשר
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
