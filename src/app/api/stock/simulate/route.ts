import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { simulateOutbound } from "@/lib/stock";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const body = await req.json();
  const lines = Array.isArray(body.lines) ? body.lines : [];
  const result = await simulateOutbound(
    lines.map((l: { variantId: string; quantity: number }) => ({
      variantId: String(l.variantId),
      quantity: Math.max(0, Number(l.quantity) || 0),
    }))
  );
  return NextResponse.json(result);
}
