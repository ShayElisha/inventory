import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAdmin, getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

/**
 * סנכרון בסיסי מ־Shopify Admin API:
 * מושך מוצרים ויוצר/מעדכן לפי SKU (barcode/sku).
 */
export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const user = await prisma.user.findFirst({
    where: { id: session.id },
    select: { permissionsJson: true },
  });
  if (
    !canAdmin(session.role) &&
    !hasPermission(session.role, "integrations.manage", user?.permissionsJson)
  ) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const integration = await prisma.integration.findFirst({
    where: {
      companyId: session.companyId,
      provider: "SHOPIFY",
      active: true,
    },
  });
  if (!integration) {
    return NextResponse.json(
      { error: "Shopify לא מוגדר — שמרו חנות וטוקן קודם" },
      { status: 400 }
    );
  }

  let config: { shop?: string; accessToken?: string } = {};
  try {
    config = JSON.parse(integration.configJson || "{}");
  } catch {
    /* ignore */
  }
  if (!config.shop || !config.accessToken) {
    return NextResponse.json({ error: "הגדרות Shopify חסרות" }, { status: 400 });
  }

  const shop = config.shop.replace(/\/$/, "");
  const url = `https://${shop}/admin/api/2024-10/products.json?limit=50`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": config.accessToken,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Shopify API נכשל: ${res.status}`, detail: text.slice(0, 300) },
      { status: 502 }
    );
  }

  const data = (await res.json()) as {
    products?: {
      id: number;
      title: string;
      variants?: {
        id: number;
        sku: string | null;
        barcode: string | null;
        inventory_quantity?: number;
        price?: string;
      }[];
    }[];
  };

  let created = 0;
  let updated = 0;
  let category = await prisma.category.findFirst({
    where: { companyId: session.companyId, name: "Shopify" },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        companyId: session.companyId,
        name: "Shopify",
        hasVariants: true,
      },
    });
  }

  for (const p of data.products || []) {
    for (const v of p.variants || []) {
      const sku = (v.sku || v.barcode || `SH-${v.id}`).trim();
      if (!sku) continue;
      const existing = await prisma.productVariant.findFirst({
        where: { companyId: session.companyId, sku },
        include: { product: true },
      });
      const price = Number(v.price) || 0;
      const qty =
        typeof v.inventory_quantity === "number" ? v.inventory_quantity : null;

      if (existing) {
        await prisma.product.update({
          where: { id: existing.productId },
          data: {
            title: p.title,
            ...(price ? { sellingPrice: price } : {}),
          },
        });
        if (qty != null && qty !== existing.quantityOnHand) {
          await prisma.productVariant.update({
            where: { id: existing.id },
            data: { quantityOnHand: Math.max(0, qty) },
          });
        }
        updated++;
      } else {
        await prisma.product.create({
          data: {
            companyId: session.companyId,
            categoryId: category.id,
            title: p.title,
            baseSku: sku,
            sellingPrice: price,
            costPrice: 0,
            variants: {
              create: {
                companyId: session.companyId,
                sku,
                barcode: v.barcode || sku,
                quantityOnHand: Math.max(0, qty ?? 0),
              },
            },
          },
        });
        created++;
      }
    }
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });
  await writeAudit({
    action: "SHOPIFY_SYNC",
    entityType: "Integration",
    entityId: integration.id,
    details: { created, updated },
  });

  return NextResponse.json({ ok: true, created, updated });
}
