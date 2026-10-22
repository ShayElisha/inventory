import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/product-form";
import { requireTenant } from "@/lib/tenant";

export default async function NewProductPage() {
  noStore();
  const session = await requireTenant();
  const [categories, suppliers, locations, customFields] = await Promise.all([
    prisma.category.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId: session.companyId },
      orderBy: { name: "asc" },
    }),
    prisma.warehouseLocation.findMany({
      where: { companyId: session.companyId },
      orderBy: { code: "asc" },
    }),
    prisma.customField.findMany({
      where: {
        companyId: session.companyId,
        entityType: "PRODUCT",
        active: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="הקמת מוצר"
        description="מוצר פשוט או טבלת אפשרויות מוצר לפי קטגוריה"
      />
      <ProductForm
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        customFields={customFields}
      />
    </div>
  );
}
