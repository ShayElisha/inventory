import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { applyStockChange, StockError } from "@/lib/stock";
import { OUTBOUND_REASONS } from "@/lib/constants";
import { assertModuleApi } from "@/lib/tenant";

async function getOwned(id: string, companyId: string) {
  return prisma.outboundTemplate.findFirst({
    where: { id, companyId, active: true },
    include: {
      items: {
        include: { variant: { include: { product: true } } },
      },
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getOwned(id, session.companyId);
  if (!existing) {
    return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
  }

  await prisma.outboundTemplate.update({
    where: { id },
    data: { active: false },
  });

  await writeAudit({
    action: "DELETE_OUTBOUND_TEMPLATE",
    entityType: "OutboundTemplate",
    entityId: id,
    details: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}

/** הרצת תבנית ניפוק — מנפקת את כל השורות */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await assertModuleApi("sales");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!session?.companyId || !canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const template = await getOwned(id, session.companyId);
  if (!template) {
    return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
  }
  if (!template.items.length) {
    return NextResponse.json({ error: "לתבנית אין פריטים" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reasonCode = String(body.reasonCode || template.reasonCode || "SALE");
  const label =
    OUTBOUND_REASONS.find((r) => r.code === reasonCode)?.label || reasonCode;

  const results: {
    variantId: string;
    sku: string;
    title: string;
    quantity: number;
    ok: boolean;
    error?: string;
  }[] = [];

  for (const item of template.items) {
    try {
      await applyStockChange({
        variantId: item.variantId,
        type: "OUTBOUND",
        quantityChanged: item.quantity,
        reason: `תבנית ניפוק: ${template.name}`,
        reasonCode,
        userId: session.id,
      });
      results.push({
        variantId: item.variantId,
        sku: item.variant.sku,
        title: item.variant.product.title,
        quantity: item.quantity,
        ok: true,
      });
    } catch (e) {
      const message = e instanceof StockError ? e.message : "שגיאה בניפוק";
      results.push({
        variantId: item.variantId,
        sku: item.variant.sku,
        title: item.variant.product.title,
        quantity: item.quantity,
        ok: false,
        error: message,
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  await writeAudit({
    action: "RUN_OUTBOUND_TEMPLATE",
    entityType: "OutboundTemplate",
    entityId: id,
    details: { name: template.name, reasonCode, okCount, failCount },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
  });

  return NextResponse.json({
    templateId: id,
    name: template.name,
    reasonLabel: label,
    okCount,
    failCount,
    results,
  });
}
