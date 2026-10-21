# מערכת ניהול מלאי, לוגיסטיקה ווריאציות

Next.js + Prisma + PostgreSQL — דשבורד, קטלוג עם מחולל מטריצה, ניפוק מהיר, תנועות מלאי, סריקה וייצוא CSV.

המערכת מתחילה **ללא נתוני דוגמה**.

## הרצה מקומית

1. צרו DB ב-[Neon](https://neon.tech) (או Postgres אחר)
2. העתיקו `.env.example` ל-`.env` והדביקו את `DATABASE_URL`
3. התקינו והריצו:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

## פריסה ל-Vercel

1. חברו את הריפו ל-Vercel
2. הוסיפו Integration של **Neon** (Storage) לפרויקט — נוצר `DATABASE_URL` אוטומטית
3. Deploy — בבילד רצים `prisma migrate deploy` ואז `next build`

או מ-CLI:

```bash
vercel link
vercel integration add neon
vercel env pull .env.local
npx prisma migrate deploy
vercel --prod
```

## סדר עבודה

1. `/setup` — קטגוריות וספקים
2. `/locations` — מדפי מחסן
3. `/products/new` — מוצרים / מטריצת וריאציות
4. `/pick` — ניפוק לפי שם / מק״ט / ברקוד

## מודולים

| נתיב | תיאור |
|------|--------|
| `/` | דשבורד |
| `/pick` | ניפוק מהיר |
| `/products` | קטלוג |
| `/stock` | תנועות מלאי |
| `/locations` | מיקומים |
| `/scan` | סריקה |
| `/setup` | הגדרות |
| `/export` | ייצוא CSV |
