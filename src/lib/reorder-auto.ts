import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

/** יוצר PO-ים מקובצים לפי ספק מכללי הזמנה חוזרת שדורשים רכש */
export async function createPurchaseOrdersFromReorderSuggestions(params: {
  companyId: string;
  userId: string;
}) {
  const rules = await prisma.reorderRule.findMany({
    where: { companyId: params.companyId, active: true },
    include: {
      variant: { include: { product: true } },
      supplier: true,
    },
  });

  const needed = rules
    .filter((r) => r.variant.quantityOnHand <= r.minQty)
    .map((r) => {
      const target = r.maxQty ?? r.minQty + r.reorderQty;
      const qty = Math.max(r.reorderQty, target - r.variant.quantityOnHand);
      return {
        variantId: r.variantId,
        quantity: qty,
        unitCost: r.variant.product.costPrice || 0,
        supplierId: r.supplierId,
      };
    });

  if (!needed.length) {
    return { created: [] as { id: string; number: string; lines: number }[], message: "אין פריטים לרכש" };
  }

  const bySupplier = new Map<string | null, typeof needed>();
  for (const row of needed) {
    const key = row.supplierId || null;
    const list = bySupplier.get(key) || [];
    list.push(row);
    bySupplier.set(key, list);
  }

  const created: { id: string; number: string; lines: number; supplierId: string | null }[] = [];

  for (const [supplierId, items] of bySupplier) {
    const number = `PO-R-${Date.now().toString(36).toUpperCase()}-${created.length + 1}`;
    const po = await prisma.purchaseOrder.create({
      data: {
        companyId: params.companyId,
        number,
        supplierId,
        status: "DRAFT",
        notes: "נוצר אוטומטית מהצעות רכש (דשבורד)",
        createdById: params.userId,
        lines: {
          create: items.map((i) => ({
            variantId: i.variantId,
            qtyOrdered: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: { lines: true },
    });
    await writeAudit({
      action: "REORDER_AUTO_PO",
      entityType: "PurchaseOrder",
      entityId: po.id,
      userId: params.userId,
      details: { lines: po.lines.length, supplierId },
    });
    created.push({
      id: po.id,
      number: po.number,
      lines: po.lines.length,
      supplierId,
    });
  }

  return { created, message: `נוצרו ${created.length} הזמנות רכש` };
}
