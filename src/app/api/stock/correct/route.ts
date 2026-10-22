import { NextRequest, NextResponse } from "next/server";
import { getSession, canWrite, canAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { correctStockTransaction, StockError } from "@/lib/stock";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.companyId || !canWrite(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    // תיקון תנועה — מנהל או מחסנאי; audit תמיד
    const body = await req.json();
    const transactionId = String(body.transactionId || "");
    if (!transactionId) {
      return NextResponse.json({ error: "חסר מזהה תנועה" }, { status: 400 });
    }
    if (!canAdmin(session.role) && !body.confirm) {
      return NextResponse.json(
        { error: "נדרש אישור מנהל או confirm=true" },
        { status: 403 }
      );
    }

    const result = await correctStockTransaction({
      transactionId,
      userId: session.id,
      reason: body.reason ? String(body.reason) : undefined,
    });

    await writeAudit({
      action: "CORRECT_STOCK_TXN",
      entityType: "StockTransaction",
      entityId: transactionId,
      details: {
        reverseTxnId: result.transaction.id,
        reason: body.reason || null,
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בתיקון";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
