/** מאפיינים גלובליים לבחירה בהגדרת קטגוריה — משותפים לכל הענפים */

export const GLOBAL_CATEGORY_ATTRIBUTES: string[] = [
  // אופנה / כללי
  "מידה",
  "צבע",
  "גזרה",
  "חומר",
  "מותג",
  "מגדר",
  "עונה",
  // נעליים / אקססוריז
  "מידת נעל",
  "אורך",
  "רוחב",
  // מזון / משקאות
  "טעם",
  "משקל",
  "נפח",
  "אריזה",
  // חלפים / מוסך / טכני
  "מתח",
  "דגם",
  "יצרן",
  "צד",
  "שנה",
  // כללי מחסן
  "יחידת מידה",
  "איכות",
  "גרסה",
  "סגנון",
  "סט",
];

export function normalizeAttributeLabel(raw: string): string {
  return String(raw || "").trim().replace(/\s+/g, " ");
}

/** מאפיינים שעדיין לא נבחרו, כולל מותאמים שכבר קיימים ברשימה הגלובלית */
export function availableAttributes(
  selected: string[],
  extras: string[] = GLOBAL_CATEGORY_ATTRIBUTES
): string[] {
  const taken = new Set(selected.map((s) => s.toLowerCase()));
  return extras.filter((a) => !taken.has(a.toLowerCase()));
}
