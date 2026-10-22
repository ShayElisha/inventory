import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const sessions = await prisma.stockCountSession.findMany({
    include: { _count: { select: { lines: true } }, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const { name, zone, shelf } = await req.json();
  if (!name) return NextResponse.json({ error: "שם חובה" }, { status: 400 });

  const variants = await prisma.productVariant.findMany({
    where: {
      ...(zone || shelf
        ? {
            location: {
              ...(zone ? { zone } : {}),
              ...(shelf ? { shelf } : {}),
            },
          }
        : {}),
    },
    include: { location: true, product: true },
  });

  if (variants.length === 0) {
    return NextResponse.json(
      { error: "לא נמצאו פריטים באזור/מדף שנבחרו" },
      { status: 400 }
    );
  }

  const count = await prisma.stockCountSession.create({
    data: {
      name,
      zone: zone || null,
      shelf: shelf || null,
      createdById: session?.id || null,
      lines: {
        create: variants.map((v) => ({
          variantId: v.id,
          systemQty: v.quantityOnHand,
        })),
      },
    },
    include: { lines: true },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "StockCount",
    entityId: count.id,
    details: { name, zone, shelf, lines: variants.length },
  });

  return NextResponse.json(count, { status: 201 });
}
