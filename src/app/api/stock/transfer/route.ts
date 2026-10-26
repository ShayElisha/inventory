import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { transferByLocationCode, transferLocation, StockError } from "@/lib/stock";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }
    const body = await req.json();
    const { variantId, toLocationId, locationCode, reason } = body;

    if (!variantId || (!toLocationId && !locationCode)) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const owned = await prisma.productVariant.findFirst({
      where: { id: variantId, companyId: session.companyId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
    }

    const result = locationCode
      ? await transferByLocationCode(
          variantId,
          String(locationCode),
          reason,
          session.companyId,
          session.id
        )
      : await transferLocation(
          variantId,
          String(toLocationId),
          reason,
          session.companyId,
          session.id
        );

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בהעברה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId: session.companyId },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(locations);
}
