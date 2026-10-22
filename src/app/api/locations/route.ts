import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();
  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId: session.companyId },
    include: { _count: { select: { variants: true } } },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { zone, aisle, shelf, bin } = await req.json();
    if (!zone || !aisle || !shelf || !bin) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }
    const code = `${zone}-${aisle}-${shelf}-${bin}`.toUpperCase();
    const location = await prisma.warehouseLocation.create({
      data: {
        companyId: session.companyId,
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
