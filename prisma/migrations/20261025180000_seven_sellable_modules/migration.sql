ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_transfers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_shipments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_lots" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_serials" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_kits" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_reorder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "mod_reports_pro" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "reorder_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "min_qty" INTEGER NOT NULL,
    "max_qty" INTEGER,
    "reorder_qty" INTEGER NOT NULL,
    "supplier_id" TEXT,
    "lead_time_days" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reorder_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reorder_rules_company_id_variant_id_key" ON "reorder_rules"("company_id", "variant_id");
CREATE INDEX IF NOT EXISTS "reorder_rules_company_id_active_idx" ON "reorder_rules"("company_id", "active");
CREATE INDEX IF NOT EXISTS "reorder_rules_supplier_id_idx" ON "reorder_rules"("supplier_id");

ALTER TABLE "reorder_rules" DROP CONSTRAINT IF EXISTS "reorder_rules_company_id_fkey";
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reorder_rules" DROP CONSTRAINT IF EXISTS "reorder_rules_variant_id_fkey";
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reorder_rules" DROP CONSTRAINT IF EXISTS "reorder_rules_supplier_id_fkey";
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
