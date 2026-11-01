-- Payments on documents
ALTER TABLE "stock_documents" ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "stock_documents" ADD COLUMN IF NOT EXISTS "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "stock_documents" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "stock_documents_company_id_payment_status_idx"
  ON "stock_documents"("company_id", "payment_status");

-- Putaway fields on goods receipt lines
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "location_id" TEXT;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "suggested_location_id" TEXT;
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "putaway_status" TEXT NOT NULL DEFAULT 'DONE';

CREATE INDEX IF NOT EXISTS "goods_receipt_lines_putaway_status_idx"
  ON "goods_receipt_lines"("putaway_status");
