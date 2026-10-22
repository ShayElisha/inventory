import { LegalPageShell } from "@/components/legal-page";

export const metadata = {
  title: "הצהרת נגישות | Sfira",
  description: "הצהרת נגישות של אתר ומערכת Sfira",
};

export default function AccessibilityPage() {
  return (
    <LegalPageShell
      title="הצהרת נגישות"
      description="Sfira שואפת לספק חוויית שימוש נגישה ככל האפשר."
    >
      <p>
        אנו פועלים להתאים את האתר והממשק לעקרונות נגישות מקובלים, לרבות ניווט
        מקלדת, ניגודיות סבירה, ותוויות לשדות טופס. חלק מהמסכים (למשל מסופון
        סריקה) מיועדים לשימוש תפעולי ומשתנים לפי מכשיר.
      </p>

      <h2 className="!mt-8 font-display text-xl font-semibold">מה עשינו</h2>
      <ul className="list-disc space-y-1 pe-5">
        <li>מבנה כותרות וקישורים ברורים בדפי השיווק והמערכת</li>
        <li>תמיכה במצב בהיר וכהה</li>
        <li>משוב שגיאה בטפסים ובמסכי התחברות</li>
        <li>אזורי לחיצה נוחים במובייל ככל האפשר</li>
      </ul>

      <h2 className="!mt-8 font-display text-xl font-semibold">פניות נגישות</h2>
      <p>
        נתקלתם בבעיית נגישות? נשמח לשמוע ולטפל בהקדם האפשרי:
      </p>
      <p>
        <a href="mailto:accessibility@sfira.app" className="text-[var(--accent)] underline">
          accessibility@sfira.app
        </a>{" "}
        ·{" "}
        <a href="/contact" className="text-[var(--accent)] underline">
          טופס יצירת קשר
        </a>
      </p>
    </LegalPageShell>
  );
}
