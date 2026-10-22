import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const lists = await prisma.pickList.findMany({
    include: {
      items: { include: { variant: { include: { product: true, location: true } } } },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const body = await req.json();
  const { reference, notes, items } = body;
  if (!reference || !items?.length) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  const list = await prisma.pickList.create({
    data: {
      reference,
      notes: notes || null,
      createdById: session?.id || null,
      updatedAt: new Date(),
      items: {
        create: items.map(
          (it: { variantId: string; quantity: number }) => ({
            variantId: it.variantId,
            quantity: Number(it.quantity),
          })
        ),
      },
    },
    include: { items: true },
  });

  await writeAudit({
    action: "CREATE",
    entityType: "PickList",
    entityId: list.id,
    details: { reference },
  });

  return NextResponse.json(list, { status: 201 });
}
