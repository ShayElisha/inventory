import { NextRequest, NextResponse } from "next/server";
import { canAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { correctStockTransaction, StockError } from "@/lib/stock";
import { requireWriteSession } from "@/lib/tenant-guard";

export async function POST(req: NextRequest) {
  try {
    const gate = await requireWriteSession();
    if (gate.error) return gate.error;
    const session = gate.session;

    const body = await req.json();
    const transactionId = String(body.transactionId || "");
    if (!transactionId) {
      return NextResponse.json({ error: "חסר מזהה תנועה" }, { status: 400 });
    }
    if (!canAdmin(session.role) && !body.confirm) {
      return NextResponse.json(
        { error: "נדרש אישור מנהל או סימון אישור מפורש" },
        { status: 403 }
      );
    }

    const result = await correctStockTransaction({
      transactionId,
      userId: session.id,
      companyId: session.companyId,
      reason: body.reason ? String(body.reason) : undefined,
    });

    await writeAudit({
      action: "CORRECT_STOCK_TXN",
      entityType: "StockTransaction",
      entityId: transactionId,
      userId: session.id,
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
