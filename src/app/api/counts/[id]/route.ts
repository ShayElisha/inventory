import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyStockChange } from "@/lib/stock";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const { id } = await params;
  const session = await prisma.stockCountSession.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      lines: {
        include: {
          variant: { include: { product: true, location: true } },
        },
        orderBy: { variant: { sku: "asc" } },
      },
      createdBy: true,
    },
  });
  if (!session) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const user = await getSession();
  if (!user?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const owned = await prisma.stockCountSession.findFirst({
    where: { id, companyId: user.companyId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  if (body.action === "set_count") {
    const countedQty = Number(body.countedQty);
    const line = await prisma.stockCountLine.findUnique({
      where: { id: body.lineId },
    });
    if (!line || line.sessionId !== id) {
      return NextResponse.json({ error: "שורה לא נמצאה" }, { status: 404 });
    }
    const updated = await prisma.stockCountLine.update({
      where: { id: line.id },
      data: {
        countedQty,
        variance: countedQty - line.systemQty,
      },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "close_and_adjust") {
    const session = await prisma.stockCountSession.findFirst({
      where: { id, companyId: user.companyId },
      include: { lines: true },
    });
    if (!session) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    for (const line of session.lines) {
      if (line.countedQty == null) continue;
      if (line.countedQty === line.systemQty) continue;
      await applyStockChange({
        variantId: line.variantId,
        type: "ADJUSTMENT",
        quantityChanged: 0,
        setQuantityTo: line.countedQty,
        reason: `ספירה: ${session.name}`,
        reasonCode: "COUNT",
        userId: user?.id,
      });
    }

    const closed = await prisma.stockCountSession.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    await writeAudit({
      action: "CLOSE_COUNT",
      entityType: "StockCount",
      entityId: id,
      details: { adjusted: session.lines.filter((l) => l.variance).length },
    });

    return NextResponse.json(closed);
  }

  return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
}
