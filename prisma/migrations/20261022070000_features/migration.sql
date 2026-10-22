-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit_of_measure" TEXT NOT NULL DEFAULT 'UNIT';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "units_per_carton" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "reason_code" TEXT;
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");

CREATE TABLE IF NOT EXISTS "product_change_logs" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_change_logs_product_id_idx" ON "product_change_logs"("product_id");
CREATE INDEX IF NOT EXISTS "product_change_logs_created_at_idx" ON "product_change_logs"("created_at");

CREATE TABLE IF NOT EXISTS "pick_lists" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pick_lists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pick_lists_status_idx" ON "pick_lists"("status");

CREATE TABLE IF NOT EXISTS "pick_list_items" (
    "id" TEXT NOT NULL,
    "pick_list_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "picked_qty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "pick_list_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pick_list_items_pick_list_id_idx" ON "pick_list_items"("pick_list_id");

CREATE TABLE IF NOT EXISTS "stock_count_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "shelf" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_count_lines" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "system_qty" INTEGER NOT NULL,
    "counted_qty" INTEGER,
    "variance" INTEGER,
    CONSTRAINT "stock_count_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_count_lines_session_id_variant_id_key" ON "stock_count_lines"("session_id", "variant_id");

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_read_created_at_idx" ON "notifications"("read", "created_at");

CREATE INDEX IF NOT EXISTS "products_title_idx" ON "products"("title");
CREATE INDEX IF NOT EXISTS "warehouse_locations_zone_idx" ON "warehouse_locations"("zone");
CREATE INDEX IF NOT EXISTS "warehouse_locations_shelf_idx" ON "warehouse_locations"("shelf");
CREATE INDEX IF NOT EXISTS "stock_transactions_reason_code_idx" ON "stock_transactions"("reason_code");

-- FKs (ignore if exist via DO blocks simplified — Prisma deploy on fresh/partial)
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "product_change_logs" ADD CONSTRAINT "product_change_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "product_change_logs" ADD CONSTRAINT "product_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "pick_list_items" ADD CONSTRAINT "pick_list_items_pick_list_id_fkey" FOREIGN KEY ("pick_list_id") REFERENCES "pick_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "pick_list_items" ADD CONSTRAINT "pick_list_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
