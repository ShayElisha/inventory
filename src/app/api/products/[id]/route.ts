import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth";
import { logProductChange, writeAudit } from "@/lib/audit";
import { parseJsonArray, stringifyJson } from "@/lib/json";
import { buildVariantSku } from "@/lib/sku";
import { applyStockChange, StockError } from "@/lib/stock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      category: true,
      supplier: true,
      variants: { include: { location: true }, orderBy: { sku: "asc" } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
  }
  return NextResponse.json(product);
}

type VariantPatch = {
  id?: string;
  sku?: string;
  barcode?: string;
  attributes?: Record<string, string> | string;
  quantityOnHand?: number | string;
  locationId?: string | null;
  minAlertLevel?: number | string;
  remove?: boolean;
};

function parseAttrs(
  raw: Record<string, string> | string | undefined
): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, String(v)])
        );
      }
    } catch {
      return {};
    }
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v)])
  );
}

function parseQty(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, companyId: session.companyId },
      include: { variants: true, category: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const title = body.title != null ? String(body.title).trim() : existing.title;
    const baseSku =
      body.baseSku != null
        ? String(body.baseSku).trim().toUpperCase()
        : existing.baseSku;
    const categoryId = body.categoryId || existing.categoryId;

    if (!title || !baseSku) {
      return NextResponse.json({ error: "שם ומק״ט חובה" }, { status: 400 });
    }

    let category = await prisma.category.findFirst({
      where: { id: categoryId, companyId: session.companyId },
    });
    if (!category) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 400 });
    }

    if (body.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: body.supplierId, companyId: session.companyId },
      });
      if (!supplier) {
        return NextResponse.json({ error: "ספק לא נמצא" }, { status: 400 });
      }
    }

    const variantPatches: VariantPatch[] = Array.isArray(body.variants)
      ? body.variants
      : [];

    // שדרוג קטגוריה אם נוספו מאפיינים
    const attrKeys = new Set(parseJsonArray(category.attributeSchema));
    for (const row of variantPatches) {
      if (row.remove) continue;
      const attrs = parseAttrs(row.attributes);
      for (const k of Object.keys(attrs)) {
        if (k.trim()) attrKeys.add(k.trim());
      }
    }
    const hasMultiRows =
      variantPatches.filter((r) => !r.remove).length > 1 ||
      [...attrKeys].length > 0;
    if (
      hasMultiRows &&
      (!category.hasVariants ||
        [...attrKeys].join() !==
          parseJsonArray(category.attributeSchema).join())
    ) {
      const schema = [...attrKeys];
      if (!schema.length) schema.push("מידה");
      category = await prisma.category.update({
        where: { id: category.id },
        data: {
          hasVariants: true,
          attributeSchema: stringifyJson(schema),
        },
      });
    }

    const schema = parseJsonArray(category.attributeSchema);
    const data = {
      title,
      baseSku,
      description:
        body.description !== undefined
          ? body.description
            ? String(body.description)
            : null
          : existing.description,
      categoryId,
      supplierId:
        body.supplierId !== undefined
          ? body.supplierId || null
          : existing.supplierId,
      costPrice:
        body.costPrice !== undefined
          ? Number(body.costPrice) || 0
          : existing.costPrice,
      sellingPrice:
        body.sellingPrice !== undefined
          ? Number(body.sellingPrice) || 0
          : existing.sellingPrice,
      unitOfMeasure:
        body.unitOfMeasure !== undefined
          ? String(body.unitOfMeasure)
          : existing.unitOfMeasure,
      unitsPerCarton:
        body.unitsPerCarton !== undefined
          ? Number(body.unitsPerCarton) || 1
          : existing.unitsPerCarton,
      customData:
        body.customData !== undefined
          ? typeof body.customData === "object"
            ? JSON.stringify(body.customData)
            : String(body.customData || "{}")
          : existing.customData,
      weightKg:
        body.weightKg !== undefined
          ? body.weightKg === null || body.weightKg === ""
            ? null
            : Number(body.weightKg)
          : existing.weightKg,
      volumeLiters:
        body.volumeLiters !== undefined
          ? body.volumeLiters === null || body.volumeLiters === ""
            ? null
            : Number(body.volumeLiters)
          : existing.volumeLiters,
      trackLots:
        body.trackLots !== undefined
          ? Boolean(body.trackLots)
          : existing.trackLots,
      trackSerials:
        body.trackSerials !== undefined
          ? Boolean(body.trackSerials)
          : existing.trackSerials,
      isKit:
        body.isKit !== undefined ? Boolean(body.isKit) : existing.isKit,
    };

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data,
      });

      for (const row of variantPatches) {
        const existingVariant =
          row.id && !String(row.id).startsWith("new-")
            ? existing.variants.find((v) => v.id === row.id)
            : undefined;

        if (row.remove && existingVariant) {
          if (existingVariant.quantityOnHand > 0) {
            await applyStockChange(
              {
                variantId: existingVariant.id,
                type: "ADJUSTMENT",
                quantityChanged: 0,
                setQuantityTo: 0,
                reason: "הסרת אפשרות מוצר",
                reasonCode: "SETUP",
                userId: session.id,
                companyId: session.companyId,
              },
              tx
            );
          }
          await tx.productVariant.delete({ where: { id: existingVariant.id } });
          continue;
        }

        if (row.locationId) {
          const loc = await tx.warehouseLocation.findFirst({
            where: { id: row.locationId, companyId: session.companyId },
          });
          if (!loc) throw new Error("מיקום לא שייך לחברה");
        }

        const attrs = parseAttrs(row.attributes);
        const targetQty = parseQty(row.quantityOnHand);

        if (existingVariant) {
          await tx.productVariant.update({
            where: { id: existingVariant.id },
            data: {
              ...(row.sku != null
                ? { sku: String(row.sku).trim().toUpperCase() }
                : {}),
              ...(row.barcode != null ? { barcode: String(row.barcode) } : {}),
              ...(Object.keys(attrs).length
                ? { attributes: stringifyJson(attrs) }
                : {}),
              ...(row.locationId !== undefined
                ? { locationId: row.locationId || null }
                : {}),
              ...(row.minAlertLevel !== undefined
                ? { minAlertLevel: Number(row.minAlertLevel) || 0 }
                : {}),
            },
          });

          if (
            targetQty !== undefined &&
            targetQty !== existingVariant.quantityOnHand
          ) {
            await applyStockChange(
              {
                variantId: existingVariant.id,
                type: "ADJUSTMENT",
                quantityChanged: 0,
                setQuantityTo: targetQty,
                reason: "עדכון מלאי מעריכת מוצר",
                reasonCode: "ADJUST",
                userId: session.id,
                companyId: session.companyId,
                locationId: row.locationId || existingVariant.locationId,
              },
              tx
            );
          }
          continue;
        }

        // אפשרות חדשה
        const sku =
          (row.sku && String(row.sku).trim().toUpperCase()) ||
          buildVariantSku(baseSku, attrs, schema.length ? schema : Object.keys(attrs));
        const barcode =
          (row.barcode && String(row.barcode).trim()) ||
          `${sku}-${Date.now().toString(36).slice(-4)}`;

        const created = await tx.productVariant.create({
          data: {
            companyId: session.companyId,
            productId: id,
            sku,
            barcode,
            attributes: stringifyJson(attrs),
            quantityOnHand: 0,
            locationId: row.locationId || null,
            minAlertLevel:
              row.minAlertLevel !== undefined
                ? Number(row.minAlertLevel) || 0
                : 5,
          },
        });

        if (targetQty !== undefined && targetQty > 0) {
          await applyStockChange(
            {
              variantId: created.id,
              type: "INBOUND",
              quantityChanged: targetQty,
              reason: "מלאי התחלתי באפשרות חדשה",
              reasonCode: "SETUP",
              userId: session.id,
              companyId: session.companyId,
              locationId: row.locationId || null,
              toLocationId: row.locationId || null,
            },
            tx
          );
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          supplier: true,
          variants: { include: { location: true }, orderBy: { sku: "asc" } },
        },
      });
    });

    const tracked: [string, string | null | undefined, string | null | undefined][] = [
      ["title", existing.title, data.title],
      ["baseSku", existing.baseSku, data.baseSku],
      ["costPrice", String(existing.costPrice), String(data.costPrice)],
      ["sellingPrice", String(existing.sellingPrice), String(data.sellingPrice)],
      ["categoryId", existing.categoryId, data.categoryId],
      ["supplierId", existing.supplierId, data.supplierId],
    ];
    for (const [field, oldValue, newValue] of tracked) {
      if (String(oldValue ?? "") !== String(newValue ?? "")) {
        await logProductChange({
          productId: id,
          field,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
          userId: session.id,
        });
      }
    }

    await writeAudit({
      action: "UPDATE",
      entityType: "Product",
      entityId: id,
      details: { title: data.title, baseSku: data.baseSku },
    });

    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    const message =
      e instanceof StockError
        ? e.message
        : e instanceof Error && e.message.includes("Unique")
          ? "מק״ט או ברקוד כבר קיימים"
          : e instanceof Error && e.message.includes("מיקום")
            ? e.message
            : "שגיאה בעדכון מוצר";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.product.findFirst({
    where: { id, companyId: session.companyId },
    select: { id: true, title: true, baseSku: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });

  await writeAudit({
    action: "DELETE",
    entityType: "Product",
    entityId: id,
    details: { title: existing.title, baseSku: existing.baseSku },
  });

  return NextResponse.json({ ok: true });
}
