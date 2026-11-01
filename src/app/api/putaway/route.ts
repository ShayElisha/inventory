import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { confirmPutaway, suggestPutawayLocation } from "@/lib/putaway";
import { StockError } from "@/lib/stock";

export async function GET() {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const pending = await prisma.goodsReceiptLine.findMany({
    where: {
      putawayStatus: "PENDING",
      receipt: { companyId: session.companyId },
      qtyReceived: { gt: 0 },
    },
    include: {
      variant: {
        include: { product: { select: { title: true } } },
      },
      receipt: {
        select: { id: true, number: true, receivedAt: true },
      },
    },
    orderBy: { receipt: { createdAt: "desc" } },
    take: 100,
  });

  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId: session.companyId },
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  const withSuggestions = await Promise.all(
    pending.map(async (line) => ({
      ...line,
      suggestedLocationId:
        line.suggestedLocationId ||
        (await suggestPutawayLocation(session.companyId, line.variantId)),
    }))
  );

  return NextResponse.json({ pending: withSuggestions, locations });
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("inbound");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || "confirm");

  if (action === "skip") {
    const lineId = String(body.receiptLineId || "");
    const line = await prisma.goodsReceiptLine.findFirst({
      where: {
        id: lineId,
        receipt: { companyId: session.companyId },
        putawayStatus: "PENDING",
      },
    });
    if (!line) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    await prisma.goodsReceiptLine.update({
      where: { id: line.id },
      data: { putawayStatus: "SKIPPED" },
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const updated = await confirmPutaway({
      companyId: session.companyId,
      userId: session.id,
      receiptLineId: String(body.receiptLineId),
      toLocationId: String(body.toLocationId),
      quantity:
        body.quantity != null ? Number(body.quantity) : undefined,
    });
    await writeAudit({
      action: "PUTAWAY",
      entityType: "GoodsReceiptLine",
      entityId: updated.id,
      details: {
        toLocationId: body.toLocationId,
        variantId: updated.variantId,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof StockError ? e.message : "שגיאה" },
      { status: 400 }
    );
  }
}
