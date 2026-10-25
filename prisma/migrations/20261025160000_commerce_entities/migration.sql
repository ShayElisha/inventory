-- Warehouses (parent of locations)
CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_company_id_code_key" ON "warehouses"("company_id", "code");
CREATE INDEX IF NOT EXISTS "warehouses_company_id_active_idx" ON "warehouses"("company_id", "active");

ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "warehouses_company_id_fkey";
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link existing locations to a warehouse
ALTER TABLE "warehouse_locations" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;
CREATE INDEX IF NOT EXISTS "warehouse_locations_warehouse_id_idx" ON "warehouse_locations"("warehouse_id");

ALTER TABLE "warehouse_locations" DROP CONSTRAINT IF EXISTS "warehouse_locations_warehouse_id_fkey";
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default warehouse per company + attach orphan locations
INSERT INTO "warehouses" ("id", "company_id", "name", "code", "is_default", "active", "created_at")
SELECT
  'wh_default_' || c.id,
  c.id,
  'מחסן ראשי',
  'MAIN',
  true,
  true,
  CURRENT_TIMESTAMP
FROM "companies" c
WHERE NOT EXISTS (
  SELECT 1 FROM "warehouses" w WHERE w.company_id = c.id AND w.code = 'MAIN'
);

UPDATE "warehouse_locations" loc
SET "warehouse_id" = w.id
FROM "warehouses" w
WHERE w.company_id = loc.company_id
  AND w.is_default = true
  AND loc.warehouse_id IS NULL;

-- Price lists (before customers / sales_orders FKs)
CREATE TABLE IF NOT EXISTS "price_lists" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "price_lists_company_id_name_key" ON "price_lists"("company_id", "name");
CREATE INDEX IF NOT EXISTS "price_lists_company_id_active_idx" ON "price_lists"("company_id", "active");

ALTER TABLE "price_lists" DROP CONSTRAINT IF EXISTS "price_lists_company_id_fkey";
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "price_list_items" (
    "id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "min_qty" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "price_list_items_price_list_id_variant_id_min_qty_key" ON "price_list_items"("price_list_id", "variant_id", "min_qty");
CREATE INDEX IF NOT EXISTS "price_list_items_price_list_id_idx" ON "price_list_items"("price_list_id");
CREATE INDEX IF NOT EXISTS "price_list_items_variant_id_idx" ON "price_list_items"("variant_id");

ALTER TABLE "price_list_items" DROP CONSTRAINT IF EXISTS "price_list_items_price_list_id_fkey";
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_list_items" DROP CONSTRAINT IF EXISTS "price_list_items_variant_id_fkey";
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customers
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "credit_limit" DOUBLE PRECISION,
    "price_list_id" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customers_company_id_active_idx" ON "customers"("company_id", "active");
CREATE INDEX IF NOT EXISTS "customers_company_id_name_idx" ON "customers"("company_id", "name");
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");
CREATE INDEX IF NOT EXISTS "customers_price_list_id_idx" ON "customers"("price_list_id");

ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_company_id_fkey";
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_price_list_id_fkey";
ALTER TABLE "customers" ADD CONSTRAINT "customers_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "customer_prices" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "min_qty" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "customer_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_prices_customer_id_variant_id_min_qty_key" ON "customer_prices"("customer_id", "variant_id", "min_qty");
CREATE INDEX IF NOT EXISTS "customer_prices_customer_id_idx" ON "customer_prices"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_prices_variant_id_idx" ON "customer_prices"("variant_id");

ALTER TABLE "customer_prices" DROP CONSTRAINT IF EXISTS "customer_prices_customer_id_fkey";
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_prices" DROP CONSTRAINT IF EXISTS "customer_prices_variant_id_fkey";
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sales order / waitlist customer + price list links
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "price_list_id" TEXT;
CREATE INDEX IF NOT EXISTS "sales_orders_customer_id_idx" ON "sales_orders"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_orders_price_list_id_idx" ON "sales_orders"("price_list_id");

ALTER TABLE "sales_orders" DROP CONSTRAINT IF EXISTS "sales_orders_customer_id_fkey";
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_orders" DROP CONSTRAINT IF EXISTS "sales_orders_price_list_id_fkey";
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "waitlist_items" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;
CREATE INDEX IF NOT EXISTS "waitlist_items_customer_id_idx" ON "waitlist_items"("customer_id");
ALTER TABLE "waitlist_items" DROP CONSTRAINT IF EXISTS "waitlist_items_customer_id_fkey";
ALTER TABLE "waitlist_items" ADD CONSTRAINT "waitlist_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Inventory balances (variant × location)
CREATE TABLE IF NOT EXISTS "inventory_balances" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_balances_variant_id_location_id_key" ON "inventory_balances"("variant_id", "location_id");
CREATE INDEX IF NOT EXISTS "inventory_balances_company_id_variant_id_idx" ON "inventory_balances"("company_id", "variant_id");
CREATE INDEX IF NOT EXISTS "inventory_balances_location_id_idx" ON "inventory_balances"("location_id");

ALTER TABLE "inventory_balances" DROP CONSTRAINT IF EXISTS "inventory_balances_company_id_fkey";
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" DROP CONSTRAINT IF EXISTS "inventory_balances_variant_id_fkey";
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" DROP CONSTRAINT IF EXISTS "inventory_balances_location_id_fkey";
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "warehouse_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill balances from variants that already have a location
INSERT INTO "inventory_balances" ("id", "company_id", "variant_id", "location_id", "quantity_on_hand", "quantity_reserved", "updated_at")
SELECT
  'bal_' || v.id,
  p.company_id,
  v.id,
  v.location_id,
  v.quantity_on_hand,
  v.quantity_reserved,
  CURRENT_TIMESTAMP
FROM "product_variants" v
JOIN "products" p ON p.id = v.product_id
WHERE v.location_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "inventory_balances" b
    WHERE b.variant_id = v.id AND b.location_id = v.location_id
  );

-- Shipments
CREATE TABLE IF NOT EXISTS "shipments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "carrier" TEXT,
    "tracking_ref" TEXT,
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_company_id_number_key" ON "shipments"("company_id", "number");
CREATE INDEX IF NOT EXISTS "shipments_company_id_status_idx" ON "shipments"("company_id", "status");
CREATE INDEX IF NOT EXISTS "shipments_sales_order_id_idx" ON "shipments"("sales_order_id");

ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_company_id_fkey";
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_sales_order_id_fkey";
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "shipment_packages" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "label" TEXT,
    "weight_kg" DOUBLE PRECISION,
    "length_cm" DOUBLE PRECISION,
    "width_cm" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "tracking_ref" TEXT,
    CONSTRAINT "shipment_packages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shipment_packages_shipment_id_idx" ON "shipment_packages"("shipment_id");
ALTER TABLE "shipment_packages" DROP CONSTRAINT IF EXISTS "shipment_packages_shipment_id_fkey";
ALTER TABLE "shipment_packages" ADD CONSTRAINT "shipment_packages_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "shipment_package_items" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "shipment_package_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipment_package_items_package_id_variant_id_key" ON "shipment_package_items"("package_id", "variant_id");
CREATE INDEX IF NOT EXISTS "shipment_package_items_package_id_idx" ON "shipment_package_items"("package_id");

ALTER TABLE "shipment_package_items" DROP CONSTRAINT IF EXISTS "shipment_package_items_package_id_fkey";
ALTER TABLE "shipment_package_items" ADD CONSTRAINT "shipment_package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "shipment_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipment_package_items" DROP CONSTRAINT IF EXISTS "shipment_package_items_variant_id_fkey";
ALTER TABLE "shipment_package_items" ADD CONSTRAINT "shipment_package_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Goods receipts
CREATE TABLE IF NOT EXISTS "goods_receipts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "received_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_company_id_number_key" ON "goods_receipts"("company_id", "number");
CREATE INDEX IF NOT EXISTS "goods_receipts_company_id_status_idx" ON "goods_receipts"("company_id", "status");
CREATE INDEX IF NOT EXISTS "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

ALTER TABLE "goods_receipts" DROP CONSTRAINT IF EXISTS "goods_receipts_company_id_fkey";
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" DROP CONSTRAINT IF EXISTS "goods_receipts_purchase_order_id_fkey";
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" DROP CONSTRAINT IF EXISTS "goods_receipts_created_by_id_fkey";
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "goods_receipt_lines" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "po_line_id" TEXT,
    "variant_id" TEXT NOT NULL,
    "qty_expected" INTEGER NOT NULL DEFAULT 0,
    "qty_received" INTEGER NOT NULL DEFAULT 0,
    "qty_damaged" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "goods_receipt_lines_receipt_id_idx" ON "goods_receipt_lines"("receipt_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_po_line_id_idx" ON "goods_receipt_lines"("po_line_id");

ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT IF EXISTS "goods_receipt_lines_receipt_id_fkey";
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT IF EXISTS "goods_receipt_lines_po_line_id_fkey";
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT IF EXISTS "goods_receipt_lines_variant_id_fkey";
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stock transfers
CREATE TABLE IF NOT EXISTS "stock_transfers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "from_warehouse_id" TEXT,
    "to_warehouse_id" TEXT,
    "notes" TEXT,
    "shipped_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_transfers_company_id_number_key" ON "stock_transfers"("company_id", "number");
CREATE INDEX IF NOT EXISTS "stock_transfers_company_id_status_idx" ON "stock_transfers"("company_id", "status");

ALTER TABLE "stock_transfers" DROP CONSTRAINT IF EXISTS "stock_transfers_company_id_fkey";
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" DROP CONSTRAINT IF EXISTS "stock_transfers_from_warehouse_id_fkey";
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" DROP CONSTRAINT IF EXISTS "stock_transfers_to_warehouse_id_fkey";
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" DROP CONSTRAINT IF EXISTS "stock_transfers_created_by_id_fkey";
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "stock_transfer_lines" (
    "id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "from_location_id" TEXT,
    "to_location_id" TEXT,
    "qty_requested" INTEGER NOT NULL,
    "qty_shipped" INTEGER NOT NULL DEFAULT 0,
    "qty_received" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "stock_transfer_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_transfer_lines_transfer_id_idx" ON "stock_transfer_lines"("transfer_id");
CREATE INDEX IF NOT EXISTS "stock_transfer_lines_variant_id_idx" ON "stock_transfer_lines"("variant_id");

ALTER TABLE "stock_transfer_lines" DROP CONSTRAINT IF EXISTS "stock_transfer_lines_transfer_id_fkey";
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_lines" DROP CONSTRAINT IF EXISTS "stock_transfer_lines_variant_id_fkey";
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_lines" DROP CONSTRAINT IF EXISTS "stock_transfer_lines_from_location_id_fkey";
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_lines" DROP CONSTRAINT IF EXISTS "stock_transfer_lines_to_location_id_fkey";
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Return authorizations (RMA)
CREATE TABLE IF NOT EXISTS "return_authorizations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "sales_order_id" TEXT,
    "customer_id" TEXT,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "reason_code" TEXT,
    "credit_amount" DOUBLE PRECISION,
    "notes" TEXT,
    "created_by_id" TEXT,
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "return_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "return_authorizations_company_id_number_key" ON "return_authorizations"("company_id", "number");
CREATE INDEX IF NOT EXISTS "return_authorizations_company_id_status_idx" ON "return_authorizations"("company_id", "status");
CREATE INDEX IF NOT EXISTS "return_authorizations_sales_order_id_idx" ON "return_authorizations"("sales_order_id");
CREATE INDEX IF NOT EXISTS "return_authorizations_customer_id_idx" ON "return_authorizations"("customer_id");

ALTER TABLE "return_authorizations" DROP CONSTRAINT IF EXISTS "return_authorizations_company_id_fkey";
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_authorizations" DROP CONSTRAINT IF EXISTS "return_authorizations_sales_order_id_fkey";
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "return_authorizations" DROP CONSTRAINT IF EXISTS "return_authorizations_customer_id_fkey";
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "return_authorizations" DROP CONSTRAINT IF EXISTS "return_authorizations_created_by_id_fkey";
ALTER TABLE "return_authorizations" ADD CONSTRAINT "return_authorizations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "return_authorization_lines" (
    "id" TEXT NOT NULL,
    "rma_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty_requested" INTEGER NOT NULL,
    "qty_received" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "restock" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    CONSTRAINT "return_authorization_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "return_authorization_lines_rma_id_idx" ON "return_authorization_lines"("rma_id");

ALTER TABLE "return_authorization_lines" DROP CONSTRAINT IF EXISTS "return_authorization_lines_rma_id_fkey";
ALTER TABLE "return_authorization_lines" ADD CONSTRAINT "return_authorization_lines_rma_id_fkey" FOREIGN KEY ("rma_id") REFERENCES "return_authorizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_authorization_lines" DROP CONSTRAINT IF EXISTS "return_authorization_lines_variant_id_fkey";
ALTER TABLE "return_authorization_lines" ADD CONSTRAINT "return_authorization_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Attachments (polymorphic)
CREATE TABLE IF NOT EXISTS "attachments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "storage_key" TEXT NOT NULL,
    "url" TEXT,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "attachments_company_id_entity_type_entity_id_idx" ON "attachments"("company_id", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "attachments_uploaded_by_id_idx" ON "attachments"("uploaded_by_id");

ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_company_id_fkey";
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_uploaded_by_id_fkey";
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
