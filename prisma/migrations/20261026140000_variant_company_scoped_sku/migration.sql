-- SKU / barcode ייחודיים בתוך חברה (לא גלובלית)
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

UPDATE "product_variants" AS pv
SET "company_id" = p."company_id"
FROM "products" AS p
WHERE p."id" = pv."product_id"
  AND (pv."company_id" IS NULL OR pv."company_id" = '');

-- וריאנטים יתומים (לא אמורים להיות) — מוחקים לפני NOT NULL
DELETE FROM "product_variants" WHERE "company_id" IS NULL;

ALTER TABLE "product_variants" ALTER COLUMN "company_id" SET NOT NULL;

DROP INDEX IF EXISTS "product_variants_sku_key";
DROP INDEX IF EXISTS "product_variants_barcode_key";

CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_company_id_sku_key"
  ON "product_variants"("company_id", "sku");
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_company_id_barcode_key"
  ON "product_variants"("company_id", "barcode");
CREATE INDEX IF NOT EXISTS "product_variants_company_id_idx"
  ON "product_variants"("company_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_company_id_fkey'
  ) THEN
    ALTER TABLE "product_variants"
      ADD CONSTRAINT "product_variants_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
