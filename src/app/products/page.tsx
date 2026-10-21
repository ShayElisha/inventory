import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ProductsCatalog } from "@/components/products-catalog";


export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; supplierId?: string; lowStock?: string }>;
}) {
  noStore();
  const params = await searchParams;
  const [categories, suppliers, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      },
      include: {
        category: true,
        supplier: true,
        variants: { include: { location: true }, orderBy: { sku: "asc" } },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const filtered =
    params.lowStock === "1"
      ? products.filter((p) =>
          p.variants.some((v) => v.quantityOnHand <= v.minAlertLevel)
        )
      : products;

  return (
    <div>
      <PageHeader
        title="קטלוג מוצרים"
        description="מוצרים אב, וריאציות ומחולל מטריצה"
        actions={
          <Link
            href="/products/new"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            מוצר חדש
          </Link>
        }
      />
      <ProductsCatalog
        products={filtered}
        categories={categories}
        suppliers={suppliers}
        filters={params}
      />
    </div>
  );
}
