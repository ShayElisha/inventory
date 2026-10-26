import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildVariantSku, generateMatrixCombinations } from "@/lib/sku";
import { parseJsonArray, stringifyJson } from "@/lib/json";
import { logProductChange, writeAudit } from "@/lib/audit";
import { getSession, requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const supplierId = searchParams.get("supplierId");
  const lowStock = searchParams.get("lowStock") === "1";

  const products = await prisma.product.findMany({
    where: {
      companyId: session.companyId,
      ...(categoryId ? { categoryId } : {}),
      ...(supplierId ? { supplierId } : {}),
    },
    include: {
      category: true,
      supplier: true,
      variants: {
        include: { location: true },
        orderBy: { sku: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });

  const filtered = lowStock
    ? products.filter((p) =>
        p.variants.some((v) => v.quantityOnHand <= v.minAlertLevel)
      )
    : products;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const {
      title,
      baseSku,
      description,
      categoryId,
      supplierId,
      costPrice,
      sellingPrice,
      unitOfMeasure,
      unitsPerCarton,
      variants,
      simpleBarcode,
      simpleQty,
      simpleLocationId,
      matrixOptions,
      customData,
      weightKg,
      volumeLiters,
      trackLots,
      trackSerials,
      isKit,
    } = body;

    if (!title || !baseSku || !categoryId) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, companyId: session.companyId },
    });
    if (!category) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 400 });
    }

    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: String(supplierId), companyId: session.companyId },
      });
      if (!supplier) {
        return NextResponse.json({ error: "ספק לא שייך לחברה" }, { status: 403 });
      }
    }

    const schema = parseJsonArray(category.attributeSchema);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          companyId: session.companyId,
          title,
          baseSku: String(baseSku).toUpperCase(),
          description: description || null,
          categoryId,
          supplierId: supplierId || null,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          unitOfMeasure: unitOfMeasure || "UNIT",
          unitsPerCarton: Number(unitsPerCarton) || 1,
          weightKg:
            weightKg === null || weightKg === undefined || weightKg === ""
              ? null
              : Number(weightKg),
          volumeLiters:
            volumeLiters === null ||
            volumeLiters === undefined ||
            volumeLiters === ""
              ? null
              : Number(volumeLiters),
          trackLots: Boolean(trackLots),
          trackSerials: Boolean(trackSerials),
          isKit: Boolean(isKit),
          customData:
            customData && typeof customData === "object"
              ? JSON.stringify(customData)
              : typeof customData === "string"
                ? customData
                : "{}",
        },
      });

      let rows: {
        sku: string;
        barcode: string;
        attributes: Record<string, string>;
        quantityOnHand: number;
        locationId?: string | null;
        minAlertLevel?: number;
      }[] = [];

      if (category.hasVariants && (variants?.length || matrixOptions)) {
        if (variants?.length) {
          rows = variants.map(
            (v: {
              attributes: Record<string, string>;
              barcode: string;
              quantityOnHand?: number;
              locationId?: string;
              minAlertLevel?: number;
              sku?: string;
            }) => ({
              sku: v.sku || buildVariantSku(created.baseSku, v.attributes, schema),
              barcode: v.barcode,
              attributes: v.attributes,
              quantityOnHand: Number(v.quantityOnHand) || 0,
              locationId: v.locationId || null,
              minAlertLevel: v.minAlertLevel ?? 5,
            })
          );
        } else {
          const combos = generateMatrixCombinations(schema, matrixOptions || {});
          rows = combos.map((attrs, i) => ({
            sku: buildVariantSku(created.baseSku, attrs, schema),
            barcode: `${created.baseSku}-${i + 1}`.replace(/[^a-zA-Z0-9-]/g, ""),
            attributes: attrs,
            quantityOnHand: 0,
            locationId: null,
            minAlertLevel: 5,
          }));
        }
      } else {
        rows = [
          {
            sku: created.baseSku,
            barcode: simpleBarcode || `${created.baseSku}-1`,
            attributes: {},
            quantityOnHand: Number(simpleQty) || 0,
            locationId: simpleLocationId || null,
            minAlertLevel: 5,
          },
        ];
      }

      const locIds = [
        ...new Set(
          rows
            .map((r) => r.locationId)
            .filter((x): x is string => Boolean(x))
        ),
      ];
      if (locIds.length) {
        const locCount = await tx.warehouseLocation.count({
          where: { id: { in: locIds }, companyId: session.companyId },
        });
        if (locCount !== locIds.length) {
          throw new Error("מיקום לא שייך לחברה");
        }
      }

      for (const row of rows) {
        const variant = await tx.productVariant.create({
          data: {
            companyId: session.companyId,
            productId: created.id,
            sku: row.sku,
            barcode: row.barcode,
            attributes: stringifyJson(row.attributes),
            quantityOnHand: row.quantityOnHand,
            locationId: row.locationId,
            minAlertLevel: row.minAlertLevel ?? 5,
          },
        });

        if (row.quantityOnHand > 0) {
          await tx.stockTransaction.create({
            data: {
              variantId: variant.id,
              type: "INBOUND",
              quantityChanged: row.quantityOnHand,
              previousQuantity: 0,
              newQuantity: row.quantityOnHand,
              reason: "מלאי התחלתי בהקמה",
              toLocationId: row.locationId || null,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: { variants: true, category: true },
      });
    });

    if (product) {
      await logProductChange({
        productId: product.id,
        field: "created",
        oldValue: null,
        newValue: product.title,
        userId: session?.id,
      });
      await writeAudit({
        action: "CREATE",
        entityType: "Product",
        entityId: product.id,
        details: { title: product.title, baseSku: product.baseSku },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error && e.message.includes("Unique")
        ? "מק״ט או ברקוד כבר קיימים"
        : "שגיאה ביצירת מוצר";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
