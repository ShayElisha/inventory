import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { transferByLocationCode, transferLocation, StockError } from "@/lib/stock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variantId, toLocationId, locationCode, reason } = body;

    if (!variantId || (!toLocationId && !locationCode)) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const result = locationCode
      ? await transferByLocationCode(variantId, String(locationCode), reason)
      : await transferLocation(variantId, String(toLocationId), reason);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof StockError ? e.message : "שגיאה בהעברה";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const locations = await prisma.warehouseLocation.findMany({
    orderBy: { code: "asc" },
  });
  return NextResponse.json(locations);
}
