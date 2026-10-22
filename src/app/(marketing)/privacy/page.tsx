import { LegalPageShell } from "@/components/legal-page";

export const metadata = {
  title: "מדיניות פרטיות | Sfira",
  description: "כיצד Sfira אוספת, משתמשת ומגנה על מידע אישי",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="מדיניות פרטיות"
      description="מסמך זה מתאר כיצד אנו מטפלים במידע במסגרת השימוש ב־Sfira."
    >
      <h2 className="font-display text-xl font-semibold">1. כללי</h2>
      <p>
        השימוש בפלטפורמת Sfira כפוף למדיניות זו. בהרשמה ובשימוש בשירות אתם
        מאשרים את האמור להלן. המערכת מיועדת לשימוש עסקי על ידי חברות ועובדיהן.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">2. מידע שנאסף</h2>
      <p>בין היתר עשוי להיאסף:</p>
      <ul className="list-disc space-y-1 pe-5">
        <li>פרטי חברה ומנהל (שם, אימייל, טלפון)</li>
        <li>פרטי עובדים שהמנהל מוסיף למערכת</li>
        <li>נתוני מלאי, תנועות, ליקוטים, ספירות ודוחות</li>
        <li>יומני פעילות (Audit) כגון פעולות, זמן וכתובת IP</li>
        <li>מידע טכני בסיסי הנדרש להפעלת השירות ואבטחתו</li>
      </ul>

      <h2 className="!mt-8 font-display text-xl font-semibold">3. מטרות השימוש</h2>
      <p>
        המידע משמש לספק את השירות, לאבטח את החשבון, לתמוך בלקוחות, לשפר את
        המוצר, ולעמוד בחובות חוקיות. נתוני מלאי של חברה אחת אינם משותפים עם
        חברות אחרות בפלטפורמה.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">4. אבטחה</h2>
      <p>
        אנו נוקטים באמצעים סבירים להגן על המידע, לרבות הצפנת סיסמאות והפרדת
        נתונים בין חברות (רב־חברתיות). אין אבטחה מוחלטת; מומלץ להשתמש בסיסמאות
        חזקות ולהגביל הרשאות עובדים.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">5. שיתוף עם צדדים שלישיים</h2>
      <p>
        לא נמכור מידע אישי. ייתכן שיתוף עם ספקי תשתית (אירוח, מסד נתונים)
        הנדרשים להפעלת השירות, בכפוף להתחייבויות סודיות ואבטחה מקובלות, או לפי
        דרישת דין.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">6. שמירת מידע</h2>
      <p>
        המידע נשמר כל עוד החשבון פעיל או כנדרש להפעלת השירות ולחובות חוקיות.
        מחיקת חברה על ידי מנהל הפלטפורמה עשויה למחוק את נתוניה לצמיתות.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">7. זכויותיכם</h2>
      <p>
        ניתן לפנות בבקשה לעיון, תיקון או מחיקה של מידע אישי, בכפוף למגבלות
        חוקיות ולצורכי השירות — דרך{" "}
        <a href="/contact" className="text-[var(--accent)] underline">
          צור קשר
        </a>
        .
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">8. יצירת קשר</h2>
      <p>
        לשאלות בנושא פרטיות:{" "}
        <a href="mailto:privacy@sfira.app" className="text-[var(--accent)] underline">
          privacy@sfira.app
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
