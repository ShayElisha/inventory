import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { ensureDefaultWarehouse } from "@/lib/warehouses";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const warehouseId = req.nextUrl.searchParams.get("warehouseId");
  const locations = await prisma.warehouseLocation.findMany({
    where: {
      companyId: session.companyId,
      ...(warehouseId ? { warehouseId } : {}),
    },
    include: {
      _count: { select: { variants: true } },
      warehouse: { select: { id: true, name: true, code: true } },
    },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { zone, aisle, shelf, bin } = body;
    if (!zone || !aisle || !shelf || !bin) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    let warehouseId = body.warehouseId ? String(body.warehouseId) : null;
    if (warehouseId) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId: session.companyId },
      });
      if (!wh) {
        return NextResponse.json({ error: "מחסן לא נמצא" }, { status: 400 });
      }
    } else {
      const def = await ensureDefaultWarehouse(session.companyId);
      warehouseId = def.id;
    }

    const code = `${zone}-${aisle}-${shelf}-${bin}`.toUpperCase();
    const location = await prisma.warehouseLocation.create({
      data: {
        companyId: session.companyId,
        warehouseId,
        zone: String(zone).toUpperCase(),
        aisle: String(aisle),
        shelf: String(shelf),
        bin: String(bin),
        code,
      },
    });
    return NextResponse.json(location, { status: 201 });
  } catch {
    return NextResponse.json({ error: "קוד מיקום כבר קיים" }, { status: 400 });
  }
}
