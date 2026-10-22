-- AlterTable
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

UPDATE "notifications" SET "company_id" = 'cm_default_company_001' WHERE "company_id" IS NULL;

ALTER TABLE "notifications" ALTER COLUMN "company_id" SET NOT NULL;

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP INDEX IF EXISTS "notifications_read_created_at_idx";
CREATE INDEX IF NOT EXISTS "notifications_company_id_read_created_at_idx" ON "notifications"("company_id", "read", "created_at");
