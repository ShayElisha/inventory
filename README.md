# Sfira — מערכת מלאי ומחסן (WMS קל)

Next.js 16 · React 19 · Prisma · PostgreSQL (Neon) · Vercel

מוצר עברי RTL לניהול מלאי, רכש, מכירות, ליקוט, משלוחים ומודולים נמכרים לפי חברה.

המערכת מתחילה **ללא נתוני דוגמה** (אלא אם מריצים seed).

## הרצה מקומית

1. צרו DB ב-[Neon](https://neon.tech) (או Postgres אחר)
2. העתיקו `.env.example` ל-`.env` והדביקו את `DATABASE_URL`
3. התקינו והריצו:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

בדיקות:

```bash
npm test
npm run typecheck
```

## פריסה ל-Vercel

1. חברו את הריפו ל-Vercel
2. הוסיפו Integration של **Neon**
3. Deploy — בבילד: `prisma migrate deploy` + `next build`

אופציונלי בסביבה:

| משתנה | תפקיד |
|--------|--------|
| `EMAIL_WEBHOOK_URL` | שליחת אימיילים (התראות / סיכום יומי) |
| `CRON_SECRET` | להרצת `POST /api/notifications/digest` מ־cron |
| `SHIPMENT_WEBHOOK_SECRET` | עדכון מעקב משלוחים חיצוני |
| `AUTH_SECRET` | חתימת JWT (חובה בפרודקשן) |

## סדר עבודה מומלץ

1. סופר־אדמין מאשר חברה ומדליק מודולים
2. `/setup` — קטגוריות וספקים
3. `/locations` — מחסנים ומדפים
4. `/products` — קטלוג / וריאנטים / ברקודים
5. קליטה (`/inbound` או `/floor/receive`) → ניפוק / הזמנות → ליקוט → משלוח
6. דשבורד: «מה לעשות עכשיו» (רכש, השמה, גבייה)

## מודולים עיקריים

| אזור | נתיבים |
|------|--------|
| דשבורד | `/dashboard` |
| מלאי | `/products` `/locations` `/stock` `/lots` `/serials` `/counts` `/scan` `/kits` |
| רכש | `/purchases` `/inbound` `/putaway` `/reorder` |
| מכירות | `/orders` `/customers` `/price-lists` `/waitlist` `/returns` |
| ניפוק | `/outbound` `/picks` `/waves` `/shipments` `/documents` |
| רצפה | `/floor` (קליטה / מדף / ניפוק + מצלמה) |
| דוחות | `/reports` `/reports/balances` `/reports-pro` `/export` |
| ניהול | `/setup` `/team` `/integrations` `/audit` `/help` |

## פיצ׳רים מרכזיים

- מנוע מלאי אטומי + יתרות לפי מיקום + FEFO
- אכיפת אשראי לקוח ו־ATP בהזמנות
- תשלומים על חשבוניות + דוח גבייה/יתרות
- השמה למדף (putaway), גלי ליקוט + QC
- סריקת מצלמה ברצפה וב־`/scan`
- המרת קרטון↔יחידות (`unitsPerCarton`)
- API keys (`/api/v1/stock`), webhooks, סנכרון Shopify
- הרשאות דקות מעבר ל־4 תפקידים

## עזרה

מרכז העזרה בתוך האפליקציה: `/help`  
מדריכים מעודכנים לרצפה, אשראי/ATP, אינטגרציות והרשאות.
