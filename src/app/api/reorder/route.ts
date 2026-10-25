import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const gate = await assertModuleApi("reorder");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const suggestions = req.nextUrl.searchParams.get("suggestions") === "1";

  const rules = await prisma.reorderRule.findMany({
    where: { companyId: session.companyId },
    include: {
      variant: { include: { product: true } },
      supplier: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!suggestions) return NextResponse.json(rules);

  const needed = rules
    .filter((r) => r.active && r.variant.quantityOnHand <= r.minQty)
    .map((r) => {
      const target = r.maxQty ?? r.minQty + r.reorderQty;
      const qty = Math.max(r.reorderQty, target - r.variant.quantityOnHand);
      return {
        ruleId: r.id,
        variantId: r.variantId,
        sku: r.variant.sku,
        title: r.variant.product.title,
        onHand: r.variant.quantityOnHand,
        minQty: r.minQty,
        suggestQty: qty,
        supplierId: r.supplierId,
        supplierName: r.supplier?.name || null,
      };
    });

  return NextResponse.json({ rules, suggestions: needed });
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("reorder");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();

  if (body.action === "create-po") {
    const items: { variantId: string; quantity: number; unitCost?: number }[] =
      Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ error: "אין שורות" }, { status: 400 });
    }
    const number = `PO-R-${Date.now().toString(36).toUpperCase()}`;
    const po = await prisma.purchaseOrder.create({
      data: {
        companyId: session.companyId,
        number,
        supplierId: body.supplierId || null,
        status: "DRAFT",
        notes: "נוצר מכללי הזמנה חוזרת",
        createdById: session.id,
        lines: {
          create: items.map((i) => ({
            variantId: String(i.variantId),
            qtyOrdered: Math.max(1, Number(i.quantity) || 1),
            unitCost: Number(i.unitCost) || 0,
          })),
        },
      },
      include: { lines: true },
    });
    await writeAudit({
      action: "REORDER_CREATE_PO",
      entityType: "PurchaseOrder",
      entityId: po.id,
      userId: session.id,
    });
    return NextResponse.json(po, { status: 201 });
  }

  const variantId = String(body.variantId || "");
  if (!variantId) {
    return NextResponse.json({ error: "וריאנט חובה" }, { status: 400 });
  }
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { companyId: session.companyId } },
  });
  if (!variant) {
    return NextResponse.json({ error: "וריאנט לא נמצא" }, { status: 404 });
  }

  const rule = await prisma.reorderRule.upsert({
    where: {
      companyId_variantId: {
        companyId: session.companyId,
        variantId,
      },
    },
    create: {
      companyId: session.companyId,
      variantId,
      minQty: Math.max(0, Number(body.minQty) || 0),
      maxQty: body.maxQty != null ? Number(body.maxQty) : null,
      reorderQty: Math.max(1, Number(body.reorderQty) || 1),
      supplierId: body.supplierId || null,
      leadTimeDays:
        body.leadTimeDays != null ? Number(body.leadTimeDays) : null,
      active: body.active !== false,
    },
    update: {
      minQty: Math.max(0, Number(body.minQty) || 0),
      maxQty: body.maxQty != null ? Number(body.maxQty) : null,
      reorderQty: Math.max(1, Number(body.reorderQty) || 1),
      supplierId: body.supplierId || null,
      leadTimeDays:
        body.leadTimeDays != null ? Number(body.leadTimeDays) : null,
      active: body.active !== false,
    },
    include: {
      variant: { include: { product: true } },
      supplier: true,
    },
  });

  await writeAudit({
    action: "UPSERT_REORDER_RULE",
    entityType: "ReorderRule",
    entityId: rule.id,
    userId: session.id,
  });

  return NextResponse.json(rule, { status: 201 });
}
