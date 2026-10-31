export type HelpGuide = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  audience: ("ADMIN" | "WAREHOUSE" | "VIEWER" | "ALL")[];
  minutes: number;
  steps: { title: string; body: string }[];
  tips?: string[];
  relatedHref?: string;
  relatedLabel?: string;
};

export const HELP_CATEGORIES = [
  "התחלה",
  "מלאי",
  "רכש",
  "מכירות",
  "ניפוק ומשלוח",
  "צוות והרשאות",
  "דוחות",
] as const;

export const HELP_GUIDES: HelpGuide[] = [
  {
    slug: "getting-started",
    title: "צעדים ראשונים ב־Sfira",
    summary: "איך להתחיל לעבוד אחרי שהחברה אושרה ונפתח חשבון.",
    category: "התחלה",
    audience: ["ALL"],
    minutes: 4,
    relatedHref: "/dashboard",
    relatedLabel: "לדשבורד",
    steps: [
      {
        title: "התחברות",
        body: "היכנסו עם אימייל או טלפון והסיסמה. אם קיבלתם סיסמה זמנית — המערכת תחייב להחליף אותה מיד.",
      },
      {
        title: "הכירו את הדשבורד",
        body: "בדשבורד תראו מלאי, התראות, תור עבודה (ליקוטים וספירות) ופיד תנועות. פעולות מהירות בתחתית העמוד.",
      },
      {
        title: "הגדרות בסיס (מנהל)",
        body: "בקטגוריות, ספקים ומיקומים תחת הגדרות — לפני שמוסיפים מוצרים בכמות.",
      },
    ],
    tips: [
      "מומלץ למלא לפחות מיקום אחד לפני קליטה ראשונה.",
      "לכל עובד תנו הרשאה מינימלית לפי התפקיד.",
    ],
  },
  {
    slug: "change-password",
    title: "שינוי סיסמה",
    summary: "איך להחליף סיסמה זמנית או לעדכן סיסמה בכל עת.",
    category: "התחלה",
    audience: ["ALL"],
    minutes: 2,
    relatedHref: "/account/password",
    relatedLabel: "למסך שינוי סיסמה",
    steps: [
      {
        title: "פתיחת המסך",
        body: "לחצו על אייקון המפתח בניווט העליון, או היכנסו ל־/account/password.",
      },
      {
        title: "מילוי הפרטים",
        body: "הזינו סיסמה נוכחית, סיסמה חדשה ואימות. הסיסמה חייבת לכלול אות גדולה וקטנה, מספר ותו מיוחד.",
      },
    ],
  },
  {
    slug: "inbound",
    title: "קליטת סחורה",
    summary: "הכנסת כמויות למלאי אחרי קבלת משלוח.",
    category: "רכש",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 3,
    relatedHref: "/inbound",
    relatedLabel: "לקליטה",
    steps: [
      {
        title: "בחירת פריט",
        body: "חפשו לפי שם, מק״ט או ברקוד ובחרו את אפשרות המוצר הנכונה.",
      },
      {
        title: "כמות ואישור",
        body: "הזינו כמות (ובמידת הצורך מיקום) ואשרו. התנועה תירשם ביומן המלאי.",
      },
    ],
    tips: ["אחרי קליטה גדולה כדאי לבדוק בדשבורד שהכמויות עודכנו."],
  },
  {
    slug: "outbound",
    title: "ניפוק ותבניות ניפוק",
    summary: "ניפוק מהיר או הרצת סט פריטים קבוע בלחיצה.",
    category: "ניפוק ומשלוח",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 4,
    relatedHref: "/outbound",
    relatedLabel: "לניפוק",
    steps: [
      {
        title: "ניפוק מהיר",
        body: "חפשו פריט לפי שם/מק״ט/ברקוד, בחרו סיבה וכמות, ואשרו.",
      },
      {
        title: "תבנית ניפוק חוזרת",
        body: "שמרו סט פריטים וכמויות קבוע (למשל ניפוק בוקר). אחר כך לחצו «הרץ ניפוק» — המערכת מנפקת את כל השורות ברצף.",
      },
      {
        title: "לא ליקוט",
        body: "תבניות ניפוק מורידות מלאי מיד. רשימות ליקוט (בעמוד ליקוט) הן תהליך איסוף נפרד.",
      },
    ],
    tips: [
      "אם אין מספיק מלאי לשורה — היא תסומן ככישלון והשאר ימשיכו.",
      "תבניות ליקוט נמצאות תחת «ניפוק ומשלוח → ליקוט», לא כאן.",
    ],
  },
  {
    slug: "scan",
    title: "סריקה במסופון",
    summary: "ממשק נייד ל־+1/−1 והעברות מדף.",
    category: "מלאי",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 3,
    relatedHref: "/scan",
    relatedLabel: "לסריקה",
    steps: [
      {
        title: "פתיחת מסך הסריקה",
        body: "מתאים לטלפון או מסופון. סרקו או הזינו ברקוד.",
      },
      {
        title: "עדכון כמות",
        body: "השתמשו בלחצני +1 / −1 או בהעברה בין מיקומים לפי הצורך.",
      },
    ],
  },
  {
    slug: "catalog",
    title: "ניהול קטלוג מוצרים",
    summary: "יצירת מוצרים פשוטים או עם אפשרויות מידה/צבע.",
    category: "מלאי",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 5,
    relatedHref: "/products",
    relatedLabel: "לקטלוג",
    steps: [
      {
        title: "קטגוריה קודם",
        body: "בהגדרות הגדירו קטגוריה. אם יש מידות/צבעים — סמנו שיש אפשרויות מוצר והגדירו את השדות.",
      },
      {
        title: "מוצר חדש",
        body: "ב־קטלוג → מוצר חדש: מלאו שם, מק״ט בסיס, מחירים. למוצר עם אפשרויות — השתמשו במחולל ליצירת כל השילובים.",
      },
      {
        title: "שדות מותאמים",
        body: "אם הוגדרו שדות מותאמים בהגדרות (מותג, ארץ ייצור וכו׳) — הם יופיעו בטופס המוצר.",
      },
      {
        title: "ברקוד ומיקום",
        body: "לכל אפשרות מוצר אפשר להגדיר ברקוד, מיקום במחסן וסף התראה.",
      },
    ],
  },
  {
    slug: "custom-fields",
    title: "שדות מותאמים למוצרים",
    summary: "הוספת שדות כמו מותג, קטלוג ספק או ארץ ייצור.",
    category: "מלאי",
    audience: ["ADMIN"],
    minutes: 3,
    relatedHref: "/setup",
    relatedLabel: "להגדרות",
    steps: [
      {
        title: "הגדרת שדה",
        body: "בהגדרות בסיס → שדות מותאמים: בחרו שם, סוג (טקסט/מספר/תאריך/רשימה/כן־לא) ואם חובה.",
      },
      {
        title: "מילוי במוצר",
        body: "ביצירה או עריכת מוצר יופיעו השדות החדשים. הערכים נשמרים עם המוצר.",
      },
    ],
    tips: ["רק מנהל יכול להוסיף או להסיר שדות. עובדי מחסן יכולים למלא אותם."],
  },
  {
    slug: "locations",
    title: "מיקומים במחסן",
    summary: "אזור, מעבר, מדף ותא — קוד מיקום אחיד.",
    category: "מלאי",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 3,
    relatedHref: "/locations",
    relatedLabel: "למיקומים",
    steps: [
      {
        title: "יצירת מיקום",
        body: "הגדירו אזור, מעבר, מדף ותא. המערכת בונה קוד מיקום לשימוש בסריקה ובהעברות.",
      },
      {
        title: "שיוך למוצר",
        body: "בעריכת אפשרות מוצר בחרו מיקום ברירת מחדל.",
      },
    ],
  },
  {
    slug: "picks",
    title: "רשימות ליקוט",
    summary: "איסוף פריטים להזמנה או להעברה.",
    category: "ניפוק ומשלוח",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 4,
    relatedHref: "/picks",
    relatedLabel: "לליקוטים",
    steps: [
      {
        title: "יצירת רשימה",
        body: "צרו ליקוט עם מספר אסמכתא והוסיפו פריטים וכמויות.",
      },
      {
        title: "ביצוע בשטח",
        body: "עברו על הפריטים, סמנו מה שנלקט. אפשר לעקוב אחר התקדמות בדשבורד.",
      },
      {
        title: "סיום",
        body: "כשהכול סומן — סגרו את הרשימה. המלאי מתעדכן בהתאם לתהליך.",
      },
    ],
  },
  {
    slug: "counts",
    title: "ספירת מלאי",
    summary: "ספירה לפי אזור/מדף והשוואה למערכת.",
    category: "מלאי",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 4,
    relatedHref: "/counts",
    relatedLabel: "לספירות",
    steps: [
      {
        title: "פתיחת ספירה",
        body: "צרו סשן ספירה, אפשר לציין אזור או מדף.",
      },
      {
        title: "הזנת כמויות",
        body: "לכל שורה הזינו כמות שנספרה. המערכת מציגה הפרש מול הכמות הרשומה.",
      },
      {
        title: "סגירה",
        body: "אחרי בדיקה — סגרו את הספירה. הפרשים משמעותיים כדאי לתעד ולבדוק.",
      },
    ],
  },
  {
    slug: "team",
    title: "ניהול עובדים",
    summary: "הוספת צוות, תפקידים וסיסמה זמנית בוואטסאפ.",
    category: "צוות והרשאות",
    audience: ["ADMIN"],
    minutes: 4,
    relatedHref: "/team",
    relatedLabel: "לעובדים",
    steps: [
      {
        title: "הוספת עובד",
        body: "מלאו שם, אימייל ו/או טלפון, ותפקיד (מנהל / מחסנאי / צופה).",
      },
      {
        title: "סיסמה זמנית",
        body: "המערכת מייצרת סיסמה אוטומטית. העתיקו או שלחו בוואטסאפ. בכניסה הראשונה העובד חייב להחליף סיסמה.",
      },
      {
        title: "השעיה או איפוס",
        body: "אפשר להשעות משתמש או להפיק סיסמה זמנית חדשה בכל עת.",
      },
    ],
    tips: [
      "צופה רואה נתונים בלי לבצע ניפוק/קליטה.",
      "רק מנהל רואה Audit וניהול עובדים.",
    ],
  },
  {
    slug: "roles",
    title: "תפקידים והרשאות",
    summary: "מה ההבדל בין מנהל, מחסנאי וצופה.",
    category: "צוות והרשאות",
    audience: ["ALL"],
    minutes: 2,
    steps: [
      {
        title: "מנהל",
        body: "גישה מלאה לחברה: עובדים, Audit, הגדרות, ייבוא וכל פעולות המלאי.",
      },
      {
        title: "מחסנאי",
        body: "קליטה, ניפוק, ליקוט, ספירה, סריקה וקטלוג — בלי ניהול צוות ויומן Audit.",
      },
      {
        title: "צופה",
        body: "צפייה בדוחות ובנתונים בלבד, בלי שינוי מלאי.",
      },
    ],
  },
  {
    slug: "reports",
    title: "דוחות וייצוא",
    summary: "מלאי מת, Top פריטים, פחת וייצוא Excel/CSV.",
    category: "דוחות",
    audience: ["ALL"],
    minutes: 3,
    relatedHref: "/reports",
    relatedLabel: "לדוחות",
    steps: [
      {
        title: "בחירת דוח",
        body: "בדף הדוחות בחרו את הדוח הרלוונטי (מלאי, פחת, דיוק וכו׳).",
      },
      {
        title: "ייצוא",
        body: "ניתן לייצא נתונים גם ממסך הייצוא לייבוש בגיליון אלקטרוני.",
      },
    ],
  },
  {
    slug: "import",
    title: "ייבוא CSV",
    summary: "העלאת קטלוג או עדכון כמויות בכמות.",
    category: "מלאי",
    audience: ["ADMIN", "WAREHOUSE"],
    minutes: 4,
    relatedHref: "/tools",
    relatedLabel: "לייבוא",
    steps: [
      {
        title: "הכינו קובץ",
        body: "השתמשו בפורמט העמודות שהמסך מציג. שמרו כ־CSV בקידוד UTF-8.",
      },
      {
        title: "העלאה ובדיקה",
        body: "העלו, בדקו שגיאות בשורות, ואשרו. מומלץ להתחיל בקובץ קטן לניסיון.",
      },
    ],
  },
  {
    slug: "low-stock",
    title: "התראות מלאי נמוך",
    summary: "איך עובד סף ההתראה בדשבורד.",
    category: "מלאי",
    audience: ["ALL"],
    minutes: 2,
    relatedHref: "/dashboard",
    relatedLabel: "לדשבורד",
    steps: [
      {
        title: "הגדרת סף",
        body: "לכל אפשרות מוצר יש «מינימום התראה». כשהכמות יורדת מתחתיו — הפריט מופיע בהתראות.",
      },
      {
        title: "טיפול",
        body: "בצעו קליטה או הזמנת רכש חיצונית, ועדכנו כמויות במערכת.",
      },
    ],
  },
  {
    slug: "company-approval",
    title: "אישור חברה חדשה",
    summary: "למה אי אפשר להתחבר מיד אחרי הרשמה.",
    category: "התחלה",
    audience: ["ALL"],
    minutes: 2,
    steps: [
      {
        title: "הרשמה",
        body: "אחרי הרשמת חברה הבקשה ממתינה לאישור מנהל הפלטפורמה (סופר־אדמין).",
      },
      {
        title: "אחרי האישור",
        body: "רק אז אפשר להתחבר עם הפרטים שנרשמו ולהתחיל לעבוד.",
      },
    ],
  },
];

export function getGuide(slug: string) {
  return HELP_GUIDES.find((g) => g.slug === slug) ?? null;
}

export function guidesByCategory() {
  const map = new Map<string, HelpGuide[]>();
  for (const cat of HELP_CATEGORIES) map.set(cat, []);
  for (const g of HELP_GUIDES) {
    const list = map.get(g.category) || [];
    list.push(g);
    map.set(g.category, list);
  }
  return [...map.entries()].filter(([, list]) => list.length > 0);
}
