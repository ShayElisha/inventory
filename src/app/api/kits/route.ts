import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { applyStockChange, StockError } from "@/lib/stock";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const kits = await prisma.product.findMany({
    where: { companyId: session.companyId, isKit: true },
    include: {
      kitComponents: {
        include: { componentVariant: { include: { product: true } } },
      },
      variants: true,
    },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(kits);
}

/** הגדרת רכיבי קיט / הרכבה / פירוק */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "set");

  if (action === "set") {
    const kitProductId = String(body.kitProductId || "");
    const components: { variantId: string; quantity: number }[] = Array.isArray(
      body.components
    )
      ? body.components
      : [];
    const product = await prisma.product.findFirst({
      where: { id: kitProductId, companyId: session.companyId },
    });
    if (!product) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
    }
    await prisma.product.update({
      where: { id: kitProductId },
      data: { isKit: true },
    });
    await prisma.kitComponent.deleteMany({ where: { kitProductId } });
    if (components.length) {
      await prisma.kitComponent.createMany({
        data: components.map((c) => ({
          kitProductId,
          componentVariantId: String(c.variantId),
          quantity: Math.max(1, Number(c.quantity) || 1),
        })),
      });
    }
    const kit = await prisma.product.findUnique({
      where: { id: kitProductId },
      include: {
        kitComponents: {
          include: { componentVariant: { include: { product: true } } },
        },
      },
    });
    return NextResponse.json(kit);
  }

  // assemble: מוריד רכיבים, מעלה קיט | disassemble: הפוך
  const kitVariantId = String(body.kitVariantId || "");
  const quantity = Math.max(1, Number(body.quantity) || 1);
  const kitVariant = await prisma.productVariant.findFirst({
    where: {
      id: kitVariantId,
      product: { companyId: session.companyId, isKit: true },
    },
    include: {
      product: {
        include: {
          kitComponents: true,
        },
      },
    },
  });
  if (!kitVariant) {
    return NextResponse.json({ error: "קיט לא נמצא" }, { status: 404 });
  }
  const comps = kitVariant.product.kitComponents;
  if (!comps.length) {
    return NextResponse.json({ error: "לקיט אין רכיבים" }, { status: 400 });
  }

  try {
    if (action === "assemble") {
      for (const c of comps) {
        await applyStockChange({
          variantId: c.componentVariantId,
          type: "OUTBOUND",
          quantityChanged: c.quantity * quantity,
          reason: `הרכבת קיט ${kitVariant.sku}`,
          reasonCode: "KIT_ASSEMBLE",
          userId: session.id,
          companyId: session.companyId,
        });
      }
      await applyStockChange({
        variantId: kitVariantId,
        type: "INBOUND",
        quantityChanged: quantity,
        reason: `הרכבת קיט ${kitVariant.sku}`,
        reasonCode: "KIT_ASSEMBLE",
        userId: session.id,
        companyId: session.companyId,
      });
    } else if (action === "disassemble") {
      await applyStockChange({
        variantId: kitVariantId,
        type: "OUTBOUND",
        quantityChanged: quantity,
        reason: `פירוק קיט ${kitVariant.sku}`,
        reasonCode: "KIT_DISASSEMBLE",
        userId: session.id,
        companyId: session.companyId,
      });
      for (const c of comps) {
        await applyStockChange({
          variantId: c.componentVariantId,
          type: "INBOUND",
          quantityChanged: c.quantity * quantity,
          reason: `פירוק קיט ${kitVariant.sku}`,
          reasonCode: "KIT_DISASSEMBLE",
          userId: session.id,
          companyId: session.companyId,
        });
      }
    } else {
      return NextResponse.json({ error: "פעולה לא חוקית" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof StockError ? e.message : "שגיאה" },
      { status: 400 }
    );
  }

  await writeAudit({
    action: action === "assemble" ? "KIT_ASSEMBLE" : "KIT_DISASSEMBLE",
    entityType: "ProductVariant",
    entityId: kitVariantId,
    details: { quantity },
  });

  return NextResponse.json({ ok: true });
}
