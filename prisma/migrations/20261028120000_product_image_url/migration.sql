-- תמונה אופציונלית למוצר
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
