import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";

export async function GET() {
  const gate = await assertModuleApi("transfers");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const list = await prisma.stockTransfer.findMany({
    where: { companyId: session.companyId },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      lines: {
        include: {
          variant: { include: { product: true } },
          fromLocation: true,
          toLocation: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("transfers");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "הוסיפו לפחות שורה" }, { status: 400 });
  }

  const number =
    String(body.number || "").trim() ||
    `TR-${Date.now().toString(36).toUpperCase()}`;

  const transfer = await prisma.stockTransfer.create({
    data: {
      companyId: session.companyId,
      number,
      fromWarehouseId: body.fromWarehouseId || null,
      toWarehouseId: body.toWarehouseId || null,
      notes: body.notes ? String(body.notes).trim() : null,
      createdById: session.id,
      lines: {
        create: items.map(
          (i: {
            variantId: string;
            qtyRequested: number;
            fromLocationId?: string;
            toLocationId?: string;
          }) => ({
            variantId: String(i.variantId),
            qtyRequested: Math.max(1, Number(i.qtyRequested) || 1),
            fromLocationId: i.fromLocationId || null,
            toLocationId: i.toLocationId || null,
          })
        ),
      },
    },
    include: {
      lines: { include: { variant: { include: { product: true } } } },
      fromWarehouse: true,
      toWarehouse: true,
    },
  });

  await writeAudit({
    action: "CREATE_TRANSFER",
    entityType: "StockTransfer",
    entityId: transfer.id,
    userId: session.id,
    details: { number: transfer.number },
  });

  return NextResponse.json(transfer, { status: 201 });
}
