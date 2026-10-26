# Sfira — תוכן מצגת מלא (מצגת מוצר / פרויקט גמר)

מסמך זה בנוי כ־**שקפים מוכנים להעתקה** ל־PowerPoint / Google Slides / Canva.  
כל שקף: כותרת → נקודות → הערות מרצה (אופציונלי).

**מותג:** Sfira — מערכת ניהול מלאי, לוגיסטיקה ואפשרויות מוצר  
**סטאק:** Next.js 16.4 · React 19 · Prisma 5 · PostgreSQL (Neon) · Vercel  
**שפה:** עברית מלאה (RTL) · Multi-tenant SaaS

---

# חלק א׳ — פתיחה ואסטרטגיה

## שקף 1 — שער
**כותרת:** Sfira  
**תת־כותרת:** מערכת ניהול מלאי, לוגיסטיקה ואפשרויות מוצר  
**שורה תחתונה:** מ־קליטה ועד משלוח · רב־חברתי · מודולים נמכרים

**הערות מרצה:** פתיחה ב־15 שניות — מה זה, למי זה, למה זה שונה מגיליון Excel.

---

## שקף 2 — בעיית השוק
**כותרת:** למה צריך מערכת מלאי אמיתית?

- Excel נשבר כשיש כמה עובדים, כמה מדפים, וריאנטים ומעקב תוקף
- טעויות מלאי = אובדן מכירות / עודף מלאי / פחת
- עסקים קטנים־בינוניים צריכים WMS “קטן” בלי ERP כבד
- צורך ברב־חברתיות (SaaS) + הרשאות + Audit

**הערות מרצה:** ספרו סיפור של מחסן עם 3 עובדים וסריקה בטלפון.

---

## שקף 3 — החזון של Sfira
**כותרת:** חזון המוצר

- מערכת מלאי מלאה בעברית, מוכנה לפרודקשן
- ליבה חינמית/בסיסית + **מודולי מכירה** שסופר־אדמין מדליק לפי חוזה
- זרימות מחסן אמיתיות: קליטה, ניפוק, ליקוט, ספירה, העברות, משלוחים, RMA
- דיוק מלאי: אצוות (FEFO), סריאליים, שמירה (reserve), סימולציה לפני ניפוק

---

## שקף 4 — קהל יעד
**כותרת:** למי זה מיועד?

| קהל | צורך |
|-----|------|
| מחסנים קטנים־בינוניים | ניפוק/קליטה מהירים + סריקה |
| קמעונאים עם וריאנטים | מטריצת מידה×צבע + ברקודים |
| סיטונאים | הזמנות לקוח, מחירונים, אשראי |
| מנהלי רשת / SaaS | סופר־אדמין, אישור חברות, מודולים |
| צוות מחסן | מסופון, ליקוט, ספירה |

---

## שקף 5 — הצעת הערך במשפט אחד
**כותרת:** Value Proposition

> Sfira הופכת מחסן מבוזר (אנשים + מדפים + מוצרים) למערכת אחת עם מלאי מדויק, תהליכים מודולריים, והפרדת לקוחות מלאה — בעברית, בענן.

---

# חלק ב׳ — ארכיטקטורה וטכנולוגיה

## שקף 6 — ארכיטקטורה כללית
**כותרת:** איך המערכת בנויה?

```
[דפדפן] → Next.js App Router (Server + Client)
                ↓
         Middleware (JWT + תפקידים)
                ↓
    API Routes + Server Pages
                ↓
         Prisma ORM
                ↓
      PostgreSQL (Neon)
```

שלושה אזורי אפליקציה:
1. **Marketing** — אתר ציבורי, הרשמה, התחברות
2. **App** — מערכת החברה (tenant)
3. **Admin** — פלטפורמת סופר־אדמין

---

## שקף 7 — סטאק טכנולוגי (מלא)
**כותרת:** Tech Stack

| שכבה | טכנולוגיה | גרסה / הערה |
|------|-----------|-------------|
| Framework | Next.js (App Router) | 16.4.2 |
| UI | React | 19.3.0 |
| עיצוב | Tailwind CSS 4 | משתני CSS למותג |
| אייקונים | lucide-react | |
| ORM | Prisma | 5.22 |
| DB | PostgreSQL | Neon מומלץ |
| Auth | JWT ב־Cookie (`jose`) | HS256, 14 יום |
| סיסמאות | bcryptjs | + חוקי חוזק |
| Excel | exceljs | ייצוא מעוצב |
| תאריכים | date-fns | |
| שפה | TypeScript 5 | |
| פריסה | Vercel | build = migrate + next build |

**אין** NextAuth/Clerk — אימות מותאם אישית לצרכי SaaS.

---

## שקף 8 — מבנה תיקיות (לוגי)
**כותרת:** מבנה הפרויקט

- `src/app/(marketing)` — landing, login, register, משפטי
- `src/app/(app)` — דשבורד וכל מסכי העבודה
- `src/app/(admin)` — ניהול פלטפורמה
- `src/app/api/*` — REST API
- `src/lib/*` — ליבת עסק (stock, auth, modules, commerce…)
- `src/components/*` — UI פאנלים
- `prisma/schema.prisma` + migrations — מודל הנתונים

---

## שקף 9 — אבטחה בשכבות
**כותרת:** אבטחה

1. **Cookie HttpOnly** עם JWT — לא LocalStorage
2. **Middleware** חוסם נתיבים לא מאומתים + VIEWER ללא כתיבה
3. **תפקידים:** SUPER_ADMIN / ADMIN / WAREHOUSE / VIEWER
4. **אישור חברה** לפני כניסה (`approved`)
5. **סיסמה זמנית** → חובה להחליף (`mustChangePassword`)
6. **בידוד טננט** — כל שאילתה לפי `companyId`
7. **AuditLog** עם פעולה, ישות, משתמש, IP
8. **validatePassword** — אורך, אותיות, ספרות, סימנים

---

# חלק ג׳ — רב־חברתיות ומודלים עסקיים

## שקף 10 — Multi-Tenant
**כותרת:** כל חברה = עולם נפרד

- מודל `Company` עם `slug` ייחודי
- משתמשים שייכים לחברה אחת
- סופר־אדמין בחברת `platform` — **לא** רואה מלאי של לקוחות; רק `/admin`
- דגלי מודולים על החברה (`modInbound`, `modSales`…)

**למה זה מורכב?** בלי isolation נכון לקוח א׳ יכול לראות מלאי של לקוח ב׳ — זה כשל אבטחה קריטי ב־SaaS.

---

## שקף 11 — זרימת onboarding חברה
**כותרת:** מה קורה כשנרשמים?

1. `/register` → יוצר `Company` עם `approved: false` + משתמש `ADMIN`
2. ניסיון התחברות → נחסם (`/login?pending=1`)
3. סופר־אדמין מאשר ב־`/admin/companies/[id]`
4. מדליק מודולים שנרכשו
5. המנהל נכנס → `/setup` → מיקומים → מוצרים → ניפוק

---

## שקף 12 — תפקידים והרשאות
**כותרת:** מטריצת הרשאות

| פעולה | SUPER_ADMIN | ADMIN | WAREHOUSE | VIEWER |
|-------|:-----------:|:-----:|:---------:|:------:|
| ניהול פלטפורמה | ✓ | | | |
| ניהול צוות חברה | | ✓ | | |
| Audit | | ✓ | | |
| כתיבת מלאי / ליקוט | | ✓ | ✓ | |
| קריאה בלבד | ✓* | ✓ | ✓ | ✓ |

\*סופר־אדמין רק באדמין פלטפורמה

פונקציות: `canWrite`, `canAdmin`, `isSuperAdmin`, `requireCompanyAdmin`, `requireSuperAdmin`

---

## שקף 13 — מודל עסקי: 12 מודולי מכירה
**כותרת:** ליבה + Upsell

**תמיד פעיל (ליבה):** מוצרים, מיקומים, תנועות, סריקה, ספירה, דשבורד, ייצוא, עזרה, צוות

**מודולים נמכרים (סופר־אדמין מדליק):**

| # | מודול | Default | נתיבים |
|---|--------|---------|--------|
| 1 | קליטה | ON | `/inbound`, `/purchases` |
| 2 | מכירה | ON | `/pick`, `/orders` |
| 3 | ליקוט | ON | `/picks` |
| 4 | לקוחות ומחירונים | OFF | `/customers`, `/price-lists` |
| 5 | החזרות (RMA) | OFF | `/returns` |
| 6 | העברות בין מחסנים | OFF | `/transfers` |
| 7 | משלוחים ואריזה | OFF | `/shipments` |
| 8 | אצוות ותוקף | OFF | `/lots` |
| 9 | סריאליים | OFF | `/serials` |
| 10 | קיטים והרכבה | OFF | `/kits` |
| 11 | הזמנות חוזרות | OFF | `/reorder` |
| 12 | דוחות פרימיום | OFF | `/reports-pro` |

**מנגנון טכני:**
- `SELLABLE_MODULES` ב־`modules.ts`
- `requireModule` בעמודים · `assertModuleApi` ב־API
- `navHrefAllowed` מסתיר קישורי ניווט כשהמודול כבוי
- דגלים ב־DB: `mod_inbound` … `mod_reports_pro`

---

# חלק ד׳ — מודל הנתונים (Prisma)

## שקף 14 — מפת ישויות (Overview)
**כותרת:** ~40 מודלים — חלוקה לוגית

1. זהות: Company, User  
2. קטלוג: Category, Product, ProductVariant, CustomField, KitComponent  
3. מחסן: Warehouse, WarehouseLocation, InventoryBalance, InventoryLot, SerialNumber  
4. רכש: Supplier, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine  
5. מכירה: Customer, SalesOrder, SalesOrderLine, WaitlistItem, PriceList, PriceListItem, CustomerPrice  
6. משלוח/העברה: Shipment, ShipmentPackage, ShipmentPackageItem, StockTransfer, StockTransferLine  
7. אופרציה: StockTransaction, PickList, PickTemplate, OutboundTemplate, StockCountSession  
8. החזרות/רכש חכם: ReturnAuthorization, ReorderRule  
9. מערכת: AuditLog, ProductChangeLog, Notification, StockDocument, Attachment  

---

## שקף 15 — Product → Variant (הלב של הקטלוג)
**כותרת:** מוצר אב מול אפשרות מוצר

**Product (אב):**
- `title`, `baseSku`, `description`
- `costPrice`, `sellingPrice`
- `unitOfMeasure` (UNIT/CARTON/SQM/KG/LITER/METER/PAIR/SET)
- `unitsPerCarton`, `weightKg`, `volumeLiters`
- `trackLots`, `trackSerials`, `isKit`
- `customData` (JSON לשדות מותאמים)
- `supplierId`, `categoryId`

**ProductVariant (SKU):**
- `sku` ייחודי, `barcode` ייחודי
- `attributes` (JSON — צבע/מידה…)
- `quantityOnHand`, `quantityReserved`
- `minAlertLevel`
- `locationId` (מיקום ברירת מחדל / אחרון)

**למה הפרדה?** מוצר “חולצה” יכול להיות 12 וריאנטים — מלאי נספר **לווריאנט**, לא לכותרת.

---

## שקף 16 — מחולל מטריצה
**כותרת:** יצירת וריאנטים אוטומטית

פונקציות ב־`sku.ts`:
- `generateMatrixCombinations` — קרטזיאן של ערכי מאפיינים (מידה × צבע × …)
- `buildVariantSku` — בניית מק״ט מ־baseSku + קודי מאפיינים
- `slugCode` — נירמול לאותיות/ספרות

בקטגוריה: `hasVariants` + `attributeSchema` (JSON של מאפיינים אפשריים)

---

## שקף 17 — Warehouse + Location + Balance
**כותרת:** מחסן → מדף → יתרה

- **Warehouse:** `code`, `isDefault`, `active` — מחסן־אב
- **WarehouseLocation:** `zone`, `aisle`, `shelf`, `bin`, `code` ייחודי לחברה
- **InventoryBalance:** מלאי לפי `(variantId, locationId)` — מאפשר אותו מק״ט בכמה מדפים

**מיגרציית backfill:** לכל חברה נוצר מחסן `MAIN`; יתרות נוצרו מוריאנטים עם `locationId`.

---

## שקף 18 — StockTransaction — יומן האמת
**כותרת:** כל שינוי מלאי נרשם

שדות מרכזיים:
- `type`: INBOUND | OUTBOUND | TRANSFER | ADJUSTMENT
- `quantityChanged`, `previousQuantity`, `newQuantity`
- `reason`, `reasonCode` (SALE, WASTE, RETURN, DAMAGE, COUNT, KIT_ASSEMBLE…)
- `fromLocationId`, `toLocationId`
- `lotId`, `serialId`
- `purchaseOrderId`, `salesOrderId`
- `correctedTxnId` — קישור לתיקון
- `userId`, `timestamp`

**עקרון:** המסך מציג יתרה; היומן מסביר **למה** היא השתנתה.

---

# חלק ה׳ — ליבת המלאי (החלק המורכב ביותר)

## שקף 19 — applyStockChange — פונקציית הליבה
**כותרת:** מנוע שינוי המלאי

קובץ: `src/lib/stock.ts` → `applyStockChange`

**פרמטרים עיקריים:**
| פרמטר | משמעות |
|--------|--------|
| `variantId` | איזה מק״ט |
| `type` | סוג תנועה |
| `quantityChanged` | כמות (או delta) |
| `setQuantityTo` | התאמה מוחלטת (ספירה) |
| `locationId` / from / to | מיקומים |
| `lotCode` + `expiryDate` | אצווה |
| `serial` | מספר סידורי |
| `preferFefo` | בחירת אצווה לפי תוקף מוקדם |
| `reserveDelta` | שינוי כמות שמורה |
| `purchaseOrderId` / `salesOrderId` | קישור למסמך |
| `correctedTxnId` | תיקון תנועה קודמת |

**התנהגות לפי type:**
- INBOUND: כמות חיובית → `onHand += qty` · מעדכן/יוצר Lot · יוצר Serial
- OUTBOUND: בודק מלאי מספיק · מוריד Lot ב־FEFO אם נדרש · משנה סטטוס Serial
- TRANSFER: מעדכן `locationId` בלי לשנות כמות כוללת
- ADJUSTMENT: delta או `setQuantityTo`

הכל בתוך **Prisma `$transaction`** — אטומיות.

---

## שקף 20 — FEFO (First Expired First Out)
**כותרת:** איך בוחרים אצווה לניפוק?

1. בקליטה: נוצר/מתעדכן `InventoryLot` עם `lotCode` + `expiryDate`
2. בניפוק עם `preferFefo: true` וללא `lotCode` מפורש:
   - מחפשים lot עם `quantity > 0`
   - ממיינים לפי `expiryDate ASC`, ואז `createdAt ASC`
3. מורידים מהאצווה שנבחרה; אם אין מספיק — שגיאה

**למה זה חשוב?** מזון / קוסמטיקה / תרופות — חייבים למנוע פג־תוקף במדף.

מודול `lots` מציג אצוות + פילטר “פגות תוקף ב־30 יום”.

---

## שקף 21 — סריאליים
**כותרת:** מעקב יחידה־יחידה

מודל `SerialNumber`:
- `serial` ייחודי בחברה
- `status`: IN_STOCK | SOLD | RETURNED | DAMAGED
- קישור ל־variant, lot, location

בקליטה רב־שורות: מספר הסריאלים חייב להתאים לכמות.  
מודול `serials`: חיפוש לפי סריאלי/מק״ט + סינון סטטוס.

---

## שקף 22 — שמירה (Reserve) וסימולציה
**כותרת:** מלאי זמין ≠ מלאי פיזי

- `quantityOnHand` — כמה יש במחסן
- `quantityReserved` — כמה “תפוס” להזמנות
- **זמין** = onHand − reserved

`simulateOutbound` — בודק לכל שורה אם יש מספיק **בלי** לשנות מלאי (לפני ניפוק הזמנה).  
`reserveDelta` בתוך `applyStockChange` — מעדכן שמירה בבטחה (לא לשלילה).

---

## שקף 23 — תיקון תנועה (Correction)
**כותרת:** איך מתקנים טעות בלי למחוק היסטוריה?

`correctStockTransaction`:
1. טוען תנועה מקורית
2. אם כבר תוקנה — שגיאה
3. יוצר תנועת **היפוך** (INBOUND↔OUTBOUND)
4. מקשר עם `correctedTxnId` דו־כיוונית

**עקרון חשבונאי:** לא מוחקים — מתקנים עם עקבות.

---

## שקף 24 — העברת מיקום מהירה מול מסמך העברה
**כותרת:** שני סוגי “העברה”

| סוג | API / מסך | מה קורה |
|-----|-----------|---------|
| העברת מדף מהירה | `/api/stock/transfer`, סריקה | `TRANSFER` — מחליף `locationId` |
| מסמך בין מחסנים | מודול transfers | DRAFT → ship (OUTBOUND) → receive (INBOUND) |

מסמך `StockTransfer` כולל `fromWarehouse` / `toWarehouse` ושורות עם `qtyRequested/Shipped/Received`.

---

# חלק ו׳ — תהליכים תפעוליים (End-to-End)

## שקף 25 — קליטה מלאה (Inbound Workspace)
**כותרת:** מודול קליטה

מסך `/inbound` + `/api/stock/inbound`

יכולות:
- קליטה בודדת או **רב־שורות**
- מיקום יעד לכל שורה
- אצווה + תוקף
- סריאלים (רשימה)
- סיבה / ספק / מספר חשבונית בטקסט הסיבה

מקושר גם ל־**Purchase Order**:
- יצירת PO עם שורות
- קליטה חלקית/מלאה → עדכון `qtyReceived` + סטטוס PO (`poStatusAfterReceive`)
- מודל `GoodsReceipt` לקליטה מסודרת עם `qtyDamaged`

---

## שקף 26 — ניפוק מהיר + תבניות ניפוק
**כותרת:** מודול מכירה — ניפוק

- `/pick` — ניפוק לפי שם / מק״ט / ברקוד
- סיבות: SALE, WASTE, DAMAGE, RETURN, TRANSFER_OUT, OTHER
- **OutboundTemplate** — רשימות ניפוק חוזרות (חבילות קבועות)
- API: `/api/stock/outbound`, `/api/outbound-templates`

---

## שקף 27 — הזמנות לקוח (Sales Orders)
**כותרת:** תור ניפוק עם עדיפות ו־SLA

שדות SO:
- `customerName` / `customerId` / `customerPhone`
- `priority` (1 גבוה … 5 נמוך)
- `slaDueAt`
- `vatRate` (ברירת מחדל 17%)
- `discountTiers` (JSON) או `priceListId`
- `shippingCarrier`, `shippingRef`
- סטטוס: OPEN → PARTIAL → FULFILLED → PACKED → SHIPPED

פעולות ב־API:
- יצירה עם שורות
- `simulate` לפני ניפוק
- `fulfill` עם FEFO
- עדכון סטטוס אריזה/משלוח

---

## שקף 28 — ליקוט (Pick Lists)
**כותרת:** מודול ליקוט

- **PickTemplate** — תבנית פריטים קבועים
- **PickList** — מופע עבודה: OPEN → IN_PROGRESS → DONE
- שורות עם `quantity` מול `pickedQty`
- `/api/picks/from-templates` — יצירת **כמה רשימות במקביל** מתבניות שונות

**למה מורכב?** במחסן גדול מפרידים “מה צריך לאסוף” מ־“ניפוק מיידי” — ליקוט = מסלול עבודה.

---

## שקף 29 — ספירת מלאי (Cycle Count)
**כותרת:** דיוק המלאי בשטח

- `StockCountSession` לפי zone/shelf
- לכל שורה: `systemQty` (מהמערכת) מול `countedQty` (מהשטח)
- `variance` = counted − system
- בסגירה: ADJUSTMENT עם `setQuantityTo` + התראת COUNT_VARIANCE

בדשבורד/דוחות: **אחוז דיוק ספירה**.

---

## שקף 30 — סריקה (Scan Console)
**כותרת:** מסופון מחסן

- חיפוש לפי ברקוד (`/api/variants/by-barcode`)
- +1 / −1 מהיר (`quickAdjust`)
- העברת מדף לפי קוד מיקום (`transferByLocationCode`)

מיועד לעבודה עם טלפון / סורק USB.

---

## שקף 31 — העברות בין מחסנים (מודול)
**כותרת:** Transfer Document Flow

1. יצירת מסמך + שורות (מק״ט, כמות, ממיקום, למיקום)
2. **שלח** → OUTBOUND מכל שורה → סטטוס `IN_TRANSIT`
3. **קבל** → INBOUND ביעד → `RECEIVED`
4. **בטל** מטיוטה

Audit: `CREATE_TRANSFER`, `SHIP_TRANSFER`, `RECEIVE_TRANSFER`

---

## שקף 32 — משלוחים ואריזה
**כותרת:** Shipment + Packages

1. בחירת Sales Order
2. יצירת `Shipment` עם חבילה ראשונה + פריטים (ברירת מחדל משורות ההזמנה)
3. פעולות: **ארוז** → **שלח** (carrier + tracking) → **נמסר**
4. מעדכן גם את סטטוס ה־SO ל־PACKED/SHIPPED

מודלים: Shipment → ShipmentPackage → ShipmentPackageItem

---

## שקף 33 — החזרות RMA
**כותרת:** תהליך החזרת לקוח

סטטוסים: OPEN → RECEIVED → INSPECTED → CREDITED / REJECTED / CANCELLED

סיבות: DAMAGE, WRONG_ITEM, CUSTOMER_CHANGE, OTHER  
מצב פריט: UNKNOWN, SELLABLE, DAMAGED, REFURBISH

זרימה:
1. פתיחת RMA מול לקוח/הזמנה + שורות
2. **קבל למלאי** — אם `restock` ולא DAMAGED → INBOUND
3. **זיכוי** — יוצר `StockDocument` מסוג CREDIT_NOTE

בנוסף: `/api/stock/rma` — החזרה **לספק** (ניפוק מהמלאי + מסמך RMA)

---

## שקף 34 — קיטים והרכבה
**כותרת:** BOM + Assemble / Disassemble

1. מוצר עם `isKit=true`
2. `KitComponent`: איזה וריאנטים ובאיזו כמות נכנסים לקיט
3. **הרכבה:** OUTBOUND על כל רכיב × N · INBOUND על וריאנט הקיט
4. **פירוק:** הפוך

`reasonCode`: KIT_ASSEMBLE / KIT_DISASSEMBLE

**מורכבות:** מלאי הקיט והרכיבים חייבים להישאר עקביים — לכן הכול דרך אותו מנוע `applyStockChange`.

---

## שקף 35 — Reorder (הזמנות חוזרות)
**כותרת:** ממלאי נמוך להזמנת רכש

מודל `ReorderRule`:
- `minQty`, `maxQty?`, `reorderQty`
- `supplierId`, `leadTimeDays`
- `active`

אלגוריתם הצעה:
```
אם onHand ≤ minQty:
  target = maxQty ?? (minQty + reorderQty)
  suggestQty = max(reorderQty, target − onHand)
```

פעולה: **צור PO** מההצעות המסומנות → `PurchaseOrder` בסטטוס DRAFT.

---

# חלק ז׳ — מסחר, מחירים ולקוחות

## שקף 36 — Customers + Price Lists
**כותרת:** מודול מסחרי

**Customer:** שם, טלפון, אימייל, כתובת, ח.פ, `creditLimit`, מחירון משויך, הערות, active

**PriceList:** שם, מטבע (ILS), תוקף, פריטים עם `unitPrice` + `minQty` (מדרגות כמות)

**CustomerPrice:** מחיר חריג ללקוח×וריאנט×minQty

ב־`commerce.ts`:
- `parseDiscountTiers` / `discountPercentForQty`
- `calcDocTotals` — subtotal, מע״מ, total

---

## שקף 37 — מסמכי מלאי (StockDocument)
**כותרת:** ניירת דיגיטלית

סוגים: `INVOICE` | `DELIVERY_NOTE` | `CREDIT_NOTE` | `RMA`

שדות: מספר, קישור ל־PO/SO, `payloadJson`, subtotal/vat/total

נוצרים אוטומטית בפעולות כמו זיכוי RMA / החזרה לספק.

---

# חלק ח׳ — דוחות, התראות וייצוא

## שקף 38 — דשבורד תפעולי
**כותרת:** `/dashboard` — מרכז עבודה

- KPIs לפי תקופה (היום/שבוע/חודש)
- מלאי נמוך / מלאי אפס / מלאי מת
- תור ליקוטים וספירות פתוחות
- התראות שלא נקראו
- פיד תנועות אחרונות
- פעולות מהירות בתחתית

---

## שקף 39 — דוחות בסיס מול פרימיום
**כותרת:** Analytics

**בסיס (`/reports`):**
- פילוח תנועות לפי type
- Top 20 ניפוקים
- פחת (WASTE/DAMAGE)
- מלאי מת
- מגמת שינוי יומי
- השוואת תקופות
- דיוק ספירות
- שווי לפי קטגוריה

**פרימיום (`/reports-pro`):**
- שווי מלאי כולל (עלות/מכירה)
- רווחיות גולמית (revenue − COGS)
- ניתוח **ABC**
- **Aging** (0–30 / 31–90 / 91–180 / 180+)
- תחלופה (turnover) גבוהה

API: `/api/reports/summary` (+ שער `/api/reports/premium`)

---

## שקף 40 — התראות מערכת
**כותרת:** Notification Engine

`refreshSystemNotifications(companyId)`:
- LOW_STOCK — מתחת ל־`minAlertLevel`
- ספירות פתוחות
- ליקוטים ממתינים

UI: פעמון `NotificationBell` · API `/api/notifications`

סוגים נוספים במודל: DEAD_STOCK, COUNT_VARIANCE, PICK_READY, SYSTEM

---

## שקף 41 — ייצוא וייבוא
**כותרת:** אינטגרציה עם Excel/CSV

| כיוון | נתיב | תיאור |
|-------|------|--------|
| ייצוא CSV | `/api/export/catalog`, `/transactions` | `toCsv` |
| ייצוא Excel | `/api/export/excel` | exceljs + עיצוב כותרות |
| ייבוא מוצרים | `/api/import/products` | CSV |
| עדכון כמויות | `/api/bulk/quantities` | bulk |

מסך: `/tools`, `/export`

---

# חלק ט׳ — חוויית משתמש ומוצר

## שקף 42 — ניווט ו־UX
**כותרת:** מבנה הממשק

קבוצות ניווט:
1. מלאי יומי — ניפוק, הזמנות, לקוחות, משלוחים, קליטה, העברות, סריקה, תנועות
2. ליקוט וספירה — picks, counts, kits
3. קטלוג — מוצרים, מיקומים, אצוות, סריאליים, reorder, ייבוא
4. דוחות — בסיס, פרימיום, ייצוא
5. ניהול — setup, צוות, audit, עזרה

נוסף: חיפוש גלובלי · Theme dark/light · פעמון התראות · החלפת סיסמה

---

## שקף 43 — מרכז עזרה
**כותרת:** Onboarding בתוך המוצר

`help-guides.ts` — מדריכים בעברית לפי קטגוריות:
- התחלה
- מלאי יומיומי
- קטלוג
- ליקוט וספירה
- צוות והרשאות
- דוחות

כל מדריך: steps, קהל יעד, זמן משוער, קישור למסך רלוונטי.

---

## שקף 44 — Landing / מותג
**כותרת:** שכבת השיווק

- מותג **Sfira**, צבעי ירוק־כהה + accent ליים
- Hero מלא, CTA הרשמה/התחברות
- קומפוננטות: LandingStats, AdvantagesLive, Story, Audience
- עמודים: about, contact, privacy, terms, accessibility
- הרשמה עצמית עם מסר “ממתין לאישור”

---

## שקף 45 — שדות מותאמים
**כותרת:** Custom Fields בלי לשנות סכמה

מודל `CustomField`:
- `entityType` (PRODUCT)
- `key`, `label`
- `fieldType`: TEXT | NUMBER | DATE | SELECT | BOOLEAN
- `options` ל־SELECT
- `required`, `sortOrder`, `active`

ערכים נשמרים ב־`Product.customData` כ־JSON.  
פונקציות: `fieldKeyFromLabel`, `parseCustomData`, `parseFieldOptions`

---

# חלק י׳ — API מלא (לשקף טכני / נספח)

## שקף 46 — מפת API (קבוצות)

**Auth:** login, register, logout, me, change-password  
**Admin:** stats, companies CRUD, users CRUD  
**Catalog:** products, categories, suppliers, locations, custom-fields, variants lookup/barcode, search, import, bulk  
**Stock:** inbound, outbound, adjust, transfer, reserve, correct, simulate, rma  
**Ops:** picks, pick-templates, outbound-templates, counts  
**Commerce:** purchase-orders, sales-orders, customers, price-lists, returns, transfers, shipments, lots, serials, kits, reorder  
**Insights:** reports/summary, reports/premium, export/*  
**Team/Notifs:** team, notifications  

---

## שקף 47 — פונקציות ליבה לפי קובץ

| קובץ | פונקציות מרכזיות |
|------|-------------------|
| `stock.ts` | applyStockChange, correctStockTransaction, simulateOutbound, quickAdjust, transferLocation, transferByLocationCode |
| `auth.ts` | hash/verify, create/destroy/getSession, findUserByLogin, ensureSuperAdmin, slugifyCompany, canWrite/canAdmin |
| `tenant.ts` | requireTenant, getCompanyModules, requireModule, assertModuleApi |
| `modules.ts` | SELLABLE_MODULES, modulesFromCompany, navHrefAllowed, moduleForPath |
| `commerce.ts` | discount tiers, calcDocTotals, po/so status helpers |
| `notifications.ts` | refreshSystemNotifications |
| `audit.ts` | writeAudit, logProductChange |
| `password.ts` | validatePassword, passwordStrength, generateTempPassword |
| `contact.ts` | normalizePhone/Email, detectLoginKind |
| `sku.ts` | generateMatrixCombinations, buildVariantSku |
| `export.ts` / `excel.ts` | toCsv, workbookToBuffer, styleHeader |

---

# חלק י״א — פריסה ותפעול

## שקף 48 — סביבות ופריסה
**כותרת:** Local → Vercel → Neon

**מקומי:**
```
npm install
# .env עם DATABASE_URL (+ AUTH_SECRET)
npx prisma migrate deploy
npm run dev
```

**Build בפרודקשן:**
```
prisma generate && prisma migrate deploy && next build
```

**Vercel:** חיבור ריפו + Neon Integration → `DATABASE_URL` אוטומטי → Deploy

---

## שקף 49 — סדר עבודה למשתמש חדש
**כותרת:** Happy Path

1. אישור חברה ע״י סופר־אדמין + הדלקת מודולים  
2. `/setup` — קטגוריות וספקים (+ שדות מותאמים)  
3. `/locations` — מבנה מחסן  
4. `/products/new` — מוצרים / מטריצה  
5. `/inbound` או `/purchases` — הכנסת מלאי  
6. `/pick` / `/orders` / `/picks` — ניפוק וליקוט  
7. `/reports` (+ pro) — בקרה  

---

# חלק י״ב — סיכום והדגמה

## שקף 50 — מה בנינו בפועל (Checklist)
**כותרת:** היקף המערכת

- [x] SaaS רב־חברתי עם אישור והרשאות
- [x] 12 מודולי מכירה נשלטים
- [x] קטלוג עם מטריצה, ברקודים, שדות דינמיים
- [x] מנוע מלאי אטומי עם FEFO / סריאלים / reserve / correction
- [x] קליטה, רכש, ניפוק, הזמנות, ליקוט, ספירה, סריקה
- [x] העברות מחסן, משלוחים, RMA, קיטים, Reorder
- [x] לקוחות, מחירונים, מסמכים
- [x] דשבורד, דוחות בסיס+פרימיום, התראות, ייצוא
- [x] מרכז עזרה, landing, dark mode, Audit
- [x] פריסה ל־Vercel + Neon

---

## שקף 51 — נקודות חוזק טכניות להדגשה
**כותרת:** מה מרשים בבדיקה טכנית?

1. **מנוע מלאי אחד** שמשרת את כל הזרימות  
2. **מודולריות מסחרית** אמיתית (לא feature flags מזויפים)  
3. **Audit + Correction** — עקבות מלאות  
4. **FEFO** מובנה באצוות  
5. **Multi-tenant isolation** + middleware תפקידים  
6. **UX מחסן** — סריקה, ליקוט מקבילי, ספירה עם variance  

---

## שקף 52 — הדגמה חיה מומלצת (5–7 דקות)
**כותרת:** Script להדגמה

1. Landing → הרשמה / התחברות  
2. אדמין: אישור חברה + הדלקת מודולים  
3. Setup + מיקום + מוצר עם וריאנטים  
4. קליטה עם אצווה ותוקף  
5. הזמנת לקוח → סימולציה → ניפוק FEFO  
6. ליקוט מתבנית / ספירה קצרה  
7. דוח פרימיום / התראת מלאי נמוך  

---

## שקף 53 — המשך פיתוח (Roadmap מוצע)
**כותרת:** לאן הלאה?

- חיבור מלאי מלא ל־`InventoryBalance` בכל תנועה
- Putaway / Wave picking / QC
- תשלומים וגבייה
- אינטגרציות (Shopify, webhooks, API keys)
- אפליקציית מובייל ייעודית לסריקה
- UoM conversions מתקדמות
- הרשאות מותאמות מעבר ל־4 תפקידים

---

## שקף 54 — סיום
**כותרת:** תודה

**Sfira** — מלאי מדויק · תהליכים מודולריים · מוכן לענן

שאלות?

---

# נספח א׳ — מילון מושגים קצר לקהל לא־טכני

| מושג | הסבר פשוט |
|------|-----------|
| SKU / וריאנט | מק״ט ספציפי (למשל חולצה־אדום־M) |
| FEFO | מוציאים קודם את מה שפג תוקף קודם |
| Reserve | מלאי “תפוס” להזמנה עדיין לא ניפקנו |
| ליקוט | איסוף פריטים מהמדפים לרשימה |
| RMA | אישור החזרה |
| Tenant | חברה מבודדת במערכת משותפת |
| Audit | יומן “מי עשה מה ומתי” |

---

# נספח ב׳ — סטטוסים חשובים

**PO:** DRAFT → ORDERED → PARTIAL → RECEIVED / CANCELLED  
**SO:** OPEN → PARTIAL → FULFILLED → PACKED → SHIPPED / CANCELLED  
**Pick:** OPEN → IN_PROGRESS → DONE / CANCELLED  
**Transfer:** DRAFT → IN_TRANSIT → RECEIVED / CANCELLED  
**Shipment:** DRAFT → PACKED → SHIPPED → DELIVERED / CANCELLED  
**RMA:** OPEN → RECEIVED → INSPECTED → CREDITED / REJECTED / CANCELLED  
**Serial:** IN_STOCK → SOLD / RETURNED / DAMAGED  

---

*נוצר אוטומטית מתוך קוד הפרויקט Sfira — לעדכון אחרי פיצ׳רים חדשים יש לסנכרן מול `prisma/schema.prisma` ו־`src/lib/modules.ts`.*
