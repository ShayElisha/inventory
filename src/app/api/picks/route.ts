import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import {
  assertVariantsOwned,
  forbiddenTenant,
} from "@/lib/tenant-guard";

export async function GET() {
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session;
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const lists = await prisma.pickList.findMany({
    where: { companyId: session.companyId },
    include: {
      items: { include: { variant: { include: { product: true, location: true } } } },
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("pick");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const body = await req.json();
  const { reference, notes, items } = body;
  if (!reference || !items?.length) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  const variantIds = items.map(
    (it: { variantId: string }) => String(it.variantId || "")
  );
  if (!(await assertVariantsOwned(session.companyId, variantIds))) {
    return forbiddenTenant();
  }

  const list = await prisma.pickList.create({
    data: {
      companyId: session.companyId,
      reference,
      notes: notes || null,
      createdById: session.id,
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
