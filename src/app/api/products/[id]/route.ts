import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth";
import { logProductChange, writeAudit } from "@/lib/audit";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { id, companyId: session.companyId },
      include: { variants: true },
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

    const category = await prisma.category.findFirst({
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
    };

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data,
        include: {
          category: true,
          supplier: true,
          variants: { include: { location: true }, orderBy: { sku: "asc" } },
        },
      });

      // עדכון וריאציה בודדת (מוצר פשוט) — ברקוד / מיקום / מינימום התראה
      if (Array.isArray(body.variants)) {
        for (const row of body.variants as {
          id: string;
          barcode?: string;
          locationId?: string | null;
          minAlertLevel?: number;
        }[]) {
          const variant = existing.variants.find((v) => v.id === row.id);
          if (!variant) continue;
          if (row.locationId) {
            const loc = await tx.warehouseLocation.findFirst({
              where: { id: row.locationId, companyId: session.companyId },
            });
            if (!loc) continue;
          }
          await tx.productVariant.update({
            where: { id: row.id },
            data: {
              ...(row.barcode != null ? { barcode: String(row.barcode) } : {}),
              ...(row.locationId !== undefined
                ? { locationId: row.locationId || null }
                : {}),
              ...(row.minAlertLevel !== undefined
                ? { minAlertLevel: Number(row.minAlertLevel) || 0 }
                : {}),
            },
          });
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
      e instanceof Error && e.message.includes("Unique")
        ? "מק״ט או ברקוד כבר קיימים"
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
