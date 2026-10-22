import { LegalPageShell } from "@/components/legal-page";

export const metadata = {
  title: "תנאי שימוש | Sfira",
  description: "תנאי השימוש בפלטפורמת Sfira",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="תנאי שימוש"
      description="התנאים החלים על השימוש באתר ובמערכת Sfira."
    >
      <h2 className="font-display text-xl font-semibold">1. קבלת התנאים</h2>
      <p>
        השימוש ב־Sfira מהווה הסכמה לתנאים אלה. אם אינכם מסכימים — אין להשתמש
        בשירות.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">2. השירות</h2>
      <p>
        Sfira מספקת כלי תוכנה לניהול מלאי ולוגיסטיקה לחברות. התכונות עשויות
        להשתנות, להתעדכן או להיות מוגבלות לפי תוכנית או סטטוס חשבון (למשל אישור
        חברה על ידי מנהל הפלטפורמה).
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">3. חשבונות והרשאות</h2>
      <p>
        אתם אחראים לשמירה על סודיות פרטי ההתחברות, לניהול עובדים והרשאות
        בארגון שלכם, ולדיוק הנתונים שמוזנים למערכת. שימוש לרעה, ניסיון לפרוץ
        או לפגוע בשירות אסורים.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">4. תוכן ונתונים</h2>
      <p>
        הנתונים העסקיים שאתם מזינים שייכים לכם. אתם מעניקים ל־Sfira רישיון
        מוגבל להחזיק ולעבד אותם לצורך אספקת השירות. אינכם רשאים להעלות תוכן
        בלתי חוקי או מפר זכויות.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">5. קניין רוחני</h2>
      <p>
        שם המותג Sfira, העיצוב, הקוד והממשק הם קניינה של הפלטפורמה. כל הזכויות
        שמורות לשי אלישע. אין להעתיק, לשכפל או להפיץ חלקים מהשירות ללא אישור
        מראש בכתב.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">6. אחריות</h2>
      <p>
        השירות ניתן כפי שהוא (AS IS). ככל שהדין מאפשר, לא נישא באחריות לנזקים
        עקיפים, אובדן רווחים או נזקי מלאי הנובעים משימוש או מהשבתת השירות. אין
        בכך לגרוע מזכויות הקבועות בדין שאינן ניתנות להתניה.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">7. השעיה וסיום</h2>
      <p>
        מנהל הפלטפורמה רשאי להשעות או לבטל חברה או משתמש במקרה של הפרת תנאים,
        סיכון אבטחתי, או לפי שיקול דעת סביר. ניתן להפסיק שימוש בכל עת על ידי
        הפסקת התחברות ופנייה למחיקת חשבון.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">8. שינויים</h2>
      <p>
        אנו רשאים לעדכן תנאים אלה. המשך שימוש לאחר פרסום עדכון מהווה הסכמה
        לנוסח המעודכן.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">9. יצירת קשר</h2>
      <p>
        לשאלות:{" "}
        <a href="mailto:legal@sfira.app" className="text-[var(--accent)] underline">
          legal@sfira.app
        </a>{" "}
        או דרך{" "}
        <a href="/contact" className="text-[var(--accent)] underline">
          צור קשר
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
