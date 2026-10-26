import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAdmin, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { getIndustryPreset } from "@/lib/industry-presets";
import { stringifyJson } from "@/lib/json";

/** החלת תבנית ענף — קטגוריות, מדפים, מודולים, דוגמאות */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (!canAdmin(session.role)) {
    return NextResponse.json({ error: "רק מנהל יכול להחיל תבנית" }, { status: 403 });
  }

  const body = await req.json();
  const preset = getIndustryPreset(String(body.industryId || ""));
  if (!preset) {
    return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 400 });
  }

  const withSamples = body.withSamples !== false;

  const result = await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: session.companyId },
      data: {
        industryProfile: preset.id,
        ...(preset.modules.modLots != null
          ? { modLots: preset.modules.modLots }
          : {}),
        ...(preset.modules.modSerials != null
          ? { modSerials: preset.modules.modSerials }
          : {}),
        ...(preset.modules.modKits != null
          ? { modKits: preset.modules.modKits }
          : {}),
        ...(preset.modules.modReorder != null
          ? { modReorder: preset.modules.modReorder }
          : {}),
        ...(preset.modules.modCommerce != null
          ? { modCommerce: preset.modules.modCommerce }
          : {}),
      },
    });

    let warehouse = await tx.warehouse.findFirst({
      where: { companyId: session.companyId },
    });
    if (!warehouse) {
      warehouse = await tx.warehouse.create({
        data: {
          companyId: session.companyId,
          name: "מחסן ראשי",
          code: "MAIN",
        },
      });
    }

    let locationsCreated = 0;
    for (const code of preset.locationCodes) {
      const exists = await tx.warehouseLocation.findFirst({
        where: { companyId: session.companyId, code },
      });
      if (!exists) {
        await tx.warehouseLocation.create({
          data: {
            companyId: session.companyId,
            warehouseId: warehouse.id,
            code,
            zone: code.split("-")[0] || "A",
            aisle: "1",
            shelf: "1",
            bin: "1",
          },
        });
        locationsCreated += 1;
      }
    }

    let categoriesCreated = 0;
    const categoryByName = new Map<string, string>();
    for (const cat of preset.categories) {
      let row = await tx.category.findFirst({
        where: { companyId: session.companyId, name: cat.name },
      });
      if (!row) {
        row = await tx.category.create({
          data: {
            companyId: session.companyId,
            name: cat.name,
            hasVariants: cat.hasVariants,
            attributeSchema: stringifyJson(cat.attributeSchema),
          },
        });
        categoriesCreated += 1;
      }
      categoryByName.set(cat.name, row.id);
    }

    let productsCreated = 0;
    if (withSamples && preset.sampleProducts?.length) {
      for (const sp of preset.sampleProducts) {
        const categoryId = categoryByName.get(sp.categoryName);
        if (!categoryId) continue;
        const existing = await tx.product.findFirst({
          where: {
            companyId: session.companyId,
            baseSku: sp.baseSku,
          },
        });
        if (existing) continue;

        const product = await tx.product.create({
          data: {
            companyId: session.companyId,
            categoryId,
            title: sp.title,
            baseSku: sp.baseSku,
            unitOfMeasure: sp.unitOfMeasure || "UNIT",
            trackLots: Boolean(sp.trackLots),
            trackSerials: Boolean(sp.trackSerials),
          },
        });
        await tx.productVariant.create({
          data: {
            companyId: session.companyId,
            productId: product.id,
            sku: sp.baseSku,
            barcode: sp.barcode || `${sp.baseSku}-1`,
            attributes: "{}",
            quantityOnHand: 0,
          },
        });
        productsCreated += 1;
      }
    }

    return { locationsCreated, categoriesCreated, productsCreated };
  });

  await writeAudit({
    action: "APPLY_INDUSTRY_PRESET",
    entityType: "Company",
    entityId: session.companyId,
    userId: session.id,
    details: { industryId: preset.id, ...result },
  });

  return NextResponse.json({
    ok: true,
    industryId: preset.id,
    name: preset.name,
    ...result,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { industryProfile: true },
  });
  return NextResponse.json({
    industryProfile: company?.industryProfile || null,
    presets: (
      await import("@/lib/industry-presets")
    ).INDUSTRY_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
    })),
  });
}
