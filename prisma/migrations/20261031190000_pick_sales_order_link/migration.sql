-- קישור ליקוט להזמנת לקוח
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "sales_order_id" TEXT;
ALTER TABLE "pick_list_items" ADD COLUMN IF NOT EXISTS "sales_order_line_id" TEXT;

CREATE INDEX IF NOT EXISTS "pick_lists_sales_order_id_idx" ON "pick_lists"("sales_order_id");
CREATE INDEX IF NOT EXISTS "pick_list_items_sales_order_line_id_idx" ON "pick_list_items"("sales_order_line_id");
