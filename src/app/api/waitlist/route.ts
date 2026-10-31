import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { assertModuleApi } from "@/lib/tenant";
import { assertVariantsOwned, forbiddenTenant } from "@/lib/tenant-guard";

export async function GET(req: NextRequest) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;

  const status = req.nextUrl.searchParams.get("status");
  const items = await prisma.waitlistItem.findMany({
    where: {
      companyId: session.companyId,
      ...(status ? { status } : {}),
    },
    include: {
      variant: { include: { product: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const gate = await assertModuleApi("commerce");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const variantId = String(body.variantId || "");
  const quantity = Math.max(1, Number(body.quantity) || 1);
  if (!variantId) {
    return NextResponse.json({ error: "חסר פריט" }, { status: 400 });
  }
  if (!(await assertVariantsOwned(session.companyId, [variantId]))) {
    return forbiddenTenant();
  }

  if (body.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: String(body.customerId), companyId: session.companyId },
    });
    if (!customer) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }
  }

  const item = await prisma.waitlistItem.create({
    data: {
      companyId: session.companyId,
      variantId,
      quantity,
      customerId: body.customerId ? String(body.customerId) : null,
      customerName: body.customerName
        ? String(body.customerName).trim()
        : null,
      notes: body.notes ? String(body.notes).trim() : null,
    },
    include: {
      variant: { include: { product: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  await writeAudit({
    action: "CREATE_WAITLIST",
    entityType: "WaitlistItem",
    entityId: item.id,
  });

  return NextResponse.json(item, { status: 201 });
}
