import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/product-form";
import { requireTenant } from "@/lib/tenant";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const session = await requireTenant();
  const { id } = await params;

  const [product, categories, suppliers, locations, customFields] =
    await Promise.all([
      prisma.product.findFirst({
        where: { id, companyId: session.companyId },
        include: {
          variants: { orderBy: { sku: "asc" } },
        },
      }),
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

  if (!product) notFound();

  return (
    <div>
      <PageHeader
        title="עריכת מוצר"
        description={`${product.title} · ${product.baseSku}`}
      />
      <ProductForm
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        customFields={customFields}
        product={product}
      />
    </div>
  );
}
