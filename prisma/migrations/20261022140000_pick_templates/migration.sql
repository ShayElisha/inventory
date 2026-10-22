-- CreateTable
CREATE TABLE "pick_templates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "pick_template_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "pick_lists" ADD COLUMN IF NOT EXISTS "template_id" TEXT;

-- CreateIndex
CREATE INDEX "pick_templates_company_id_idx" ON "pick_templates"("company_id");

-- CreateIndex
CREATE INDEX "pick_template_items_template_id_idx" ON "pick_template_items"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "pick_template_items_template_id_variant_id_key" ON "pick_template_items"("template_id", "variant_id");

-- CreateIndex
CREATE INDEX "pick_lists_template_id_idx" ON "pick_lists"("template_id");

-- AddForeignKey
ALTER TABLE "pick_templates" ADD CONSTRAINT "pick_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_template_items" ADD CONSTRAINT "pick_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pick_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_template_items" ADD CONSTRAINT "pick_template_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_lists" ADD CONSTRAINT "pick_lists_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pick_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
