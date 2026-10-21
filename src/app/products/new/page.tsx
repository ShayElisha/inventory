import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/product-form";


export default async function NewProductPage() {
  noStore();
  const [categories, suppliers, locations] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouseLocation.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="הקמת מוצר"
        description="מוצר פשוט או מטריצת וריאציות לפי קטגוריה"
      />
      <ProductForm
        categories={categories}
        suppliers={suppliers}
        locations={locations}
      />
    </div>
  );
}
