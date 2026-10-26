-- שדות מותאמים אופציונליים לפי קטגוריה
ALTER TABLE "custom_fields" ADD COLUMN IF NOT EXISTS "category_id" TEXT;

CREATE INDEX IF NOT EXISTS "custom_fields_category_id_idx" ON "custom_fields"("category_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_fields_category_id_fkey'
  ) THEN
    ALTER TABLE "custom_fields"
      ADD CONSTRAINT "custom_fields_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
