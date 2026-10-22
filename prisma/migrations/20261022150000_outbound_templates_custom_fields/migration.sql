-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "custom_data" TEXT NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL DEFAULT 'TEXT',
    "options" TEXT NOT NULL DEFAULT '[]',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_templates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "reason_code" TEXT NOT NULL DEFAULT 'SALE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "outbound_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_fields_company_id_entity_type_active_idx" ON "custom_fields"("company_id", "entity_type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_company_id_entity_type_key_key" ON "custom_fields"("company_id", "entity_type", "key");

-- CreateIndex
CREATE INDEX "outbound_templates_company_id_idx" ON "outbound_templates"("company_id");

-- CreateIndex
CREATE INDEX "outbound_template_items_template_id_idx" ON "outbound_template_items"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_template_items_template_id_variant_id_key" ON "outbound_template_items"("template_id", "variant_id");

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_templates" ADD CONSTRAINT "outbound_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_template_items" ADD CONSTRAINT "outbound_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "outbound_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_template_items" ADD CONSTRAINT "outbound_template_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
