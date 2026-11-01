import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ensureSchemaPatches } from "@/lib/db";

function paymentStatusFromAmounts(total: number, paidAmount: number) {
  if (paidAmount <= 0) return "UNPAID";
  if (paidAmount + 0.009 >= total) return "PAID";
  return "PARTIAL";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const { id } = await params;
  const doc = await prisma.stockDocument.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      salesOrder: {
        select: {
          id: true,
          number: true,
          customerName: true,
          shippingCarrier: true,
          shippingRef: true,
        },
      },
      purchaseOrder: { select: { id: true, number: true } },
    },
  });
  if (!doc) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }
  return NextResponse.json(doc);
}

/** רישום תשלום / עדכון סטטוס גבייה */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchemaPatches();
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const doc = await prisma.stockDocument.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!doc) {
    return NextResponse.json({ error: "מסמך לא נמצא" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    paymentStatus?: string;
    paidAmount?: number;
    paidAt?: Date | null;
  } = {};

  if (body.paymentStatus === "VOID") {
    data.paymentStatus = "VOID";
  } else if (body.markPaid === true) {
    data.paidAmount = doc.total;
    data.paymentStatus = "PAID";
    data.paidAt = new Date();
  } else if (body.paidAmount != null) {
    const paid = Math.max(0, Number(body.paidAmount) || 0);
    data.paidAmount = paid;
    data.paymentStatus = paymentStatusFromAmounts(doc.total, paid);
    data.paidAt =
      data.paymentStatus === "PAID"
        ? new Date()
        : paid > 0
          ? new Date()
          : null;
  } else if (body.paymentStatus) {
    const status = String(body.paymentStatus).toUpperCase();
    if (!["UNPAID", "PARTIAL", "PAID", "VOID"].includes(status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }
    data.paymentStatus = status;
    if (status === "PAID") {
      data.paidAmount = doc.total;
      data.paidAt = new Date();
    }
    if (status === "UNPAID") {
      data.paidAmount = 0;
      data.paidAt = null;
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "אין מה לעדכן" }, { status: 400 });
  }

  const updated = await prisma.stockDocument.update({
    where: { id },
    data,
    include: {
      salesOrder: {
        select: { id: true, number: true, customerName: true },
      },
    },
  });

  await writeAudit({
    action: "UPDATE_DOCUMENT_PAYMENT",
    entityType: "StockDocument",
    entityId: id,
    details: data,
  });

  return NextResponse.json(updated);
}
