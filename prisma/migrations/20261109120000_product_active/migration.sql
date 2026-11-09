-- Soft-delete / archive for products with commercial history
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "products_company_id_active_idx" ON "products"("company_id", "active");
