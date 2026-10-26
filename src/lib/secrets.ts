/** סודות סביבה — בפרודקשן חובה בלי fallback */

const DEV_FALLBACK = "inventory-dev-secret-change-me";

export function getAuthSecret(): string {
  const value = process.env.AUTH_SECRET?.trim();
  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Set it in the environment."
    );
  }

  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[security] AUTH_SECRET missing — using insecure dev fallback. Do not use in production."
    );
  }
  return DEV_FALLBACK;
}

/** זריעת משתמשי דמו מותרת רק בפיתוח / כשמדליקים במפורש */
export function allowDemoSeed(): boolean {
  if (process.env.ALLOW_DEMO_SEED === "true") return true;
  if (process.env.ALLOW_DEMO_SEED === "false") return false;
  return process.env.NODE_ENV !== "production";
}
