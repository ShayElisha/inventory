-- User fine-grained permissions
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions_json" TEXT;

-- Pick waves + QC
CREATE TABLE IF NOT EXISTS "pick_waves" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pick_waves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pick_waves_company_id_number_key" ON "pick_waves"("company_id", "number");
CREATE INDEX IF NOT EXISTS "pick_waves_company_id_status_idx" ON "pick_waves"("company_id", "status");

ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "wave_id" TEXT;
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "qc_status" TEXT NOT NULL DEFAULT 'NONE';
CREATE INDEX IF NOT EXISTS "pick_lists_wave_id_idx" ON "pick_lists"("wave_id");

-- Shipment tracking
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_status" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_url" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_updated_at" TIMESTAMP(3);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "tracking_events_json" TEXT NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS "shipments_tracking_status_idx" ON "shipments"("tracking_status");

-- API keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key_prefix" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "last_used_at" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "api_keys_company_id_idx" ON "api_keys"("company_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- Webhooks
CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT,
  "events" TEXT NOT NULL DEFAULT '["stock.changed","order.created","shipment.updated"]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "webhook_endpoints_company_id_active_idx" ON "webhook_endpoints"("company_id", "active");

-- Integrations (Shopify etc.)
CREATE TABLE IF NOT EXISTS "integrations" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "config_json" TEXT NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "last_sync_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_company_id_provider_key" ON "integrations"("company_id", "provider");
