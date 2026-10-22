-- AlterTable: email optional, phone unique optional
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");
