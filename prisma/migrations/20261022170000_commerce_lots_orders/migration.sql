-- Product extensions
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight_kg" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "volume_liters" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "track_lots" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "track_serials" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_kit" BOOLEAN NOT NULL DEFAULT false;

-- Stock transaction extensions
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "lot_id" TEXT;
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "serial_id" TEXT;
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "corrected_txn_id" TEXT;
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "purchase_order_id" TEXT;
ALTER TABLE "stock_transactions" ADD COLUMN IF NOT EXISTS "sales_order_id" TEXT;

CREATE TABLE IF NOT EXISTS "kit_components" (
    "id" TEXT NOT NULL,
    "kit_product_id" TEXT NOT NULL,
    "component_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "kit_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_lots" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "lot_code" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "serial_numbers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "lot_id" TEXT,
    "location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invoice_number" TEXT,
    "notes" TEXT,
    "expected_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty_ordered" INTEGER NOT NULL,
    "qty_received" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "sla_due_at" TIMESTAMP(3),
    "vat_rate" DOUBLE PRECISION NOT NULL DEFAULT 17,
    "discount_tiers" TEXT NOT NULL DEFAULT '[]',
    "shipping_carrier" TEXT,
    "shipping_ref" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_order_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty_ordered" INTEGER NOT NULL,
    "qty_fulfilled" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "waitlist_items" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customer_name" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waitlist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_documents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "sales_order_id" TEXT,
    "payload_json" TEXT NOT NULL DEFAULT '{}',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "kit_components_kit_product_id_component_variant_id_key" ON "kit_components"("kit_product_id", "component_variant_id");
CREATE INDEX IF NOT EXISTS "kit_components_kit_product_id_idx" ON "kit_components"("kit_product_id");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_lots_company_id_variant_id_lot_code_location_id_key" ON "inventory_lots"("company_id", "variant_id", "lot_code", "location_id");
CREATE INDEX IF NOT EXISTS "inventory_lots_company_id_expiry_date_idx" ON "inventory_lots"("company_id", "expiry_date");
CREATE INDEX IF NOT EXISTS "inventory_lots_variant_id_idx" ON "inventory_lots"("variant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "serial_numbers_company_id_serial_key" ON "serial_numbers"("company_id", "serial");
CREATE INDEX IF NOT EXISTS "serial_numbers_variant_id_status_idx" ON "serial_numbers"("variant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_company_id_number_key" ON "purchase_orders"("company_id", "number");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_status_idx" ON "purchase_orders"("company_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_order_lines_po_id_variant_id_key" ON "purchase_order_lines"("po_id", "variant_id");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_po_id_idx" ON "purchase_order_lines"("po_id");

CREATE UNIQUE INDEX IF NOT EXISTS "sales_orders_company_id_number_key" ON "sales_orders"("company_id", "number");
CREATE INDEX IF NOT EXISTS "sales_orders_company_id_status_priority_idx" ON "sales_orders"("company_id", "status", "priority");
CREATE INDEX IF NOT EXISTS "sales_orders_sla_due_at_idx" ON "sales_orders"("sla_due_at");

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_lines_order_id_variant_id_key" ON "sales_order_lines"("order_id", "variant_id");
CREATE INDEX IF NOT EXISTS "sales_order_lines_order_id_idx" ON "sales_order_lines"("order_id");

CREATE INDEX IF NOT EXISTS "waitlist_items_company_id_status_idx" ON "waitlist_items"("company_id", "status");
CREATE INDEX IF NOT EXISTS "waitlist_items_variant_id_idx" ON "waitlist_items"("variant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "stock_documents_company_id_type_number_key" ON "stock_documents"("company_id", "type", "number");
CREATE INDEX IF NOT EXISTS "stock_documents_company_id_type_idx" ON "stock_documents"("company_id", "type");

CREATE INDEX IF NOT EXISTS "stock_transactions_lot_id_idx" ON "stock_transactions"("lot_id");
CREATE INDEX IF NOT EXISTS "stock_transactions_sales_order_id_idx" ON "stock_transactions"("sales_order_id");
CREATE INDEX IF NOT EXISTS "stock_transactions_purchase_order_id_idx" ON "stock_transactions"("purchase_order_id");

ALTER TABLE "kit_components" DROP CONSTRAINT IF EXISTS "kit_components_kit_product_id_fkey";
ALTER TABLE "kit_components" ADD CONSTRAINT "kit_components_kit_product_id_fkey" FOREIGN KEY ("kit_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kit_components" DROP CONSTRAINT IF EXISTS "kit_components_component_variant_id_fkey";
ALTER TABLE "kit_components" ADD CONSTRAINT "kit_components_component_variant_id_fkey" FOREIGN KEY ("component_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_lots" DROP CONSTRAINT IF EXISTS "inventory_lots_company_id_fkey";
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_lots" DROP CONSTRAINT IF EXISTS "inventory_lots_variant_id_fkey";
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_lots" DROP CONSTRAINT IF EXISTS "inventory_lots_location_id_fkey";
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "serial_numbers" DROP CONSTRAINT IF EXISTS "serial_numbers_company_id_fkey";
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "serial_numbers" DROP CONSTRAINT IF EXISTS "serial_numbers_variant_id_fkey";
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "serial_numbers" DROP CONSTRAINT IF EXISTS "serial_numbers_lot_id_fkey";
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "serial_numbers" DROP CONSTRAINT IF EXISTS "serial_numbers_location_id_fkey";
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_company_id_fkey";
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_supplier_id_fkey";
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_order_lines" DROP CONSTRAINT IF EXISTS "purchase_order_lines_po_id_fkey";
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_lines" DROP CONSTRAINT IF EXISTS "purchase_order_lines_variant_id_fkey";
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_orders" DROP CONSTRAINT IF EXISTS "sales_orders_company_id_fkey";
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sales_order_lines" DROP CONSTRAINT IF EXISTS "sales_order_lines_order_id_fkey";
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_order_lines" DROP CONSTRAINT IF EXISTS "sales_order_lines_variant_id_fkey";
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waitlist_items" DROP CONSTRAINT IF EXISTS "waitlist_items_company_id_fkey";
ALTER TABLE "waitlist_items" ADD CONSTRAINT "waitlist_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waitlist_items" DROP CONSTRAINT IF EXISTS "waitlist_items_variant_id_fkey";
ALTER TABLE "waitlist_items" ADD CONSTRAINT "waitlist_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_documents" DROP CONSTRAINT IF EXISTS "stock_documents_company_id_fkey";
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_documents" DROP CONSTRAINT IF EXISTS "stock_documents_purchase_order_id_fkey";
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_documents" DROP CONSTRAINT IF EXISTS "stock_documents_sales_order_id_fkey";
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_transactions" DROP CONSTRAINT IF EXISTS "stock_transactions_lot_id_fkey";
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transactions" DROP CONSTRAINT IF EXISTS "stock_transactions_serial_id_fkey";
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_serial_id_fkey" FOREIGN KEY ("serial_id") REFERENCES "serial_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
