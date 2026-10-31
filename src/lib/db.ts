import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  schemaPatch?: Promise<void>;
};

/**
 * ב־Vercel כל serverless instance עלול לפתוח חיבורים חדשים.
 * connection_limit=1 מונע P2037 (too many database connections).
 * ל־Prisma Accelerate / prisma+postgres לא מוסיפים פרמטרים של pg.
 * ל־Neon pooler מוסיפים pgbouncer=true כדי למנוע prepared statements תקולים אחרי DDL.
 */
function databaseUrl() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("prisma://") || raw.startsWith("prisma+postgres://")) {
    return raw;
  }
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    if (!u.searchParams.has("pool_timeout")) {
      u.searchParams.set("pool_timeout", "20");
    }
    if (
      u.hostname.includes("-pooler.") &&
      !u.searchParams.has("pgbouncer")
    ) {
      u.searchParams.set("pgbouncer", "true");
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: databaseUrl() },
    },
  });

// ב־production גם כן — Fluid Compute ממחזר instances
globalForPrisma.prisma = prisma;

/** תיקון סכמה חסר אחרי deploy (db push מקומי שלא רץ על אותו DB) */
export function ensureSchemaPatches() {
  if (!globalForPrisma.schemaPatch) {
    globalForPrisma.schemaPatch = (async () => {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "sales_order_id" TEXT`
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "pick_list_items" ADD COLUMN IF NOT EXISTS "sales_order_line_id" TEXT`
        );
      } catch (e) {
        console.error("ensureSchemaPatches failed", e);
      }
    })();
  }
  return globalForPrisma.schemaPatch;
}
