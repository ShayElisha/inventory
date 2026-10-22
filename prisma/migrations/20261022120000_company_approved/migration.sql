-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT false;

-- Existing companies (and platform) are treated as already approved
UPDATE "companies" SET "approved" = true;
