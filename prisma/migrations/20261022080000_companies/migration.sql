-- CreateTable
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_key" ON "companies"("slug");

-- Seed default company for existing rows
INSERT INTO "companies" ("id", "name", "slug")
SELECT 'cm_default_company_001', 'חברת דוגמה', 'demo'
WHERE NOT EXISTS (SELECT 1 FROM "companies" WHERE "slug" = 'demo');

-- Users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "users" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL;

DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "users_company_id_idx" ON "users"("company_id");

-- Categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "categories" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "categories" ALTER COLUMN "company_id" SET NOT NULL;
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "categories_company_id_idx" ON "categories"("company_id");

-- Suppliers
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "suppliers" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "suppliers" ALTER COLUMN "company_id" SET NOT NULL;
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "suppliers_company_id_idx" ON "suppliers"("company_id");

-- Products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "products" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "products" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_base_sku_key";
CREATE UNIQUE INDEX IF NOT EXISTS "products_company_id_base_sku_key" ON "products"("company_id", "base_sku");
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "products_company_id_idx" ON "products"("company_id");

-- Locations
ALTER TABLE "warehouse_locations" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "warehouse_locations" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "warehouse_locations" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "warehouse_locations" DROP CONSTRAINT IF EXISTS "warehouse_locations_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_locations_company_id_code_key" ON "warehouse_locations"("company_id", "code");
DO $$ BEGIN
 ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "warehouse_locations_company_id_idx" ON "warehouse_locations"("company_id");

-- Pick lists
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "pick_lists" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "pick_lists" ALTER COLUMN "company_id" SET NOT NULL;
DO $$ BEGIN
 ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "pick_lists_company_id_idx" ON "pick_lists"("company_id");

-- Stock counts
ALTER TABLE "stock_count_sessions" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "stock_count_sessions" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;
ALTER TABLE "stock_count_sessions" ALTER COLUMN "company_id" SET NOT NULL;
DO $$ BEGIN
 ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "stock_count_sessions_company_id_idx" ON "stock_count_sessions"("company_id");
