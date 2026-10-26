import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { assertVariantsOwned } from "./tenant-guard";
import { applyStockChange, StockError } from "./stock";

const run = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!run)("tenant isolation (db)", () => {
  const ids: {
    companies: string[];
    products: string[];
    variants: string[];
    categories: string[];
  } = { companies: [], products: [], variants: [], categories: [] };

  afterAll(async () => {
    if (ids.variants.length) {
      await prisma.stockTransaction.deleteMany({
        where: { variantId: { in: ids.variants } },
      });
      await prisma.productVariant.deleteMany({
        where: { id: { in: ids.variants } },
      });
    }
    if (ids.products.length) {
      await prisma.product.deleteMany({ where: { id: { in: ids.products } } });
    }
    if (ids.categories.length) {
      await prisma.category.deleteMany({
        where: { id: { in: ids.categories } },
      });
    }
    if (ids.companies.length) {
      await prisma.company.deleteMany({ where: { id: { in: ids.companies } } });
    }
    await prisma.$disconnect();
  });

  it("blocks cross-company stock and ownership", async () => {
    const stamp = Date.now().toString(36);
    const a = await prisma.company.create({
      data: {
        name: `Iso A ${stamp}`,
        slug: `iso-a-${stamp}`,
        approved: true,
        active: true,
      },
    });
    const b = await prisma.company.create({
      data: {
        name: `Iso B ${stamp}`,
        slug: `iso-b-${stamp}`,
        approved: true,
        active: true,
      },
    });
    ids.companies.push(a.id, b.id);

    const catA = await prisma.category.create({
      data: {
        companyId: a.id,
        name: "CatA",
        hasVariants: false,
        attributeSchema: "[]",
      },
    });
    const catB = await prisma.category.create({
      data: {
        companyId: b.id,
        name: "CatB",
        hasVariants: false,
        attributeSchema: "[]",
      },
    });
    ids.categories.push(catA.id, catB.id);

    const pA = await prisma.product.create({
      data: {
        companyId: a.id,
        categoryId: catA.id,
        title: "Product A",
        baseSku: `SKU-A-${stamp}`,
      },
    });
    const pB = await prisma.product.create({
      data: {
        companyId: b.id,
        categoryId: catB.id,
        title: "Product B",
        baseSku: `SKU-B-${stamp}`,
      },
    });
    ids.products.push(pA.id, pB.id);

    const vA = await prisma.productVariant.create({
      data: {
        companyId: a.id,
        productId: pA.id,
        sku: `VA-${stamp}`,
        barcode: `BA-${stamp}`,
        quantityOnHand: 10,
      },
    });
    const vB = await prisma.productVariant.create({
      data: {
        companyId: b.id,
        productId: pB.id,
        sku: `VB-${stamp}`,
        barcode: `BB-${stamp}`,
        quantityOnHand: 10,
      },
    });
    ids.variants.push(vA.id, vB.id);

    expect(await assertVariantsOwned(a.id, [vA.id])).toBe(true);
    expect(await assertVariantsOwned(a.id, [vB.id])).toBe(false);
    expect(await assertVariantsOwned(a.id, [vA.id, vB.id])).toBe(false);

    await expect(
      applyStockChange({
        variantId: vB.id,
        type: "OUTBOUND",
        quantityChanged: 1,
        reason: "cross-tenant probe",
        companyId: a.id,
      })
    ).rejects.toBeInstanceOf(StockError);

    // אותו SKU מותר בחברות שונות
    const vA2 = await prisma.productVariant.create({
      data: {
        companyId: a.id,
        productId: pA.id,
        sku: `SHARED-${stamp}`,
        barcode: `BA2-${stamp}`,
      },
    });
    ids.variants.push(vA2.id);
    const vB2 = await prisma.productVariant.create({
      data: {
        companyId: b.id,
        productId: pB.id,
        sku: `SHARED-${stamp}`,
        barcode: `BB2-${stamp}`,
      },
    });
    ids.variants.push(vB2.id);
    expect(vA2.sku).toBe(vB2.sku);
  }, 30_000);
});
