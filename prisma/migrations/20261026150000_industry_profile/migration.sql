-- תבנית ענף לחברה (אופנה / מזון / חלפים / מוסכים)
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "industry_profile" TEXT;
