import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { refreshSystemNotifications } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  await refreshSystemNotifications(session.companyId);
  const items = await prisma.notification.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unread = items.filter((n) => !n.read).length;
  return NextResponse.json({ items, unread });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const body = await req.json();
  if (body.all) {
    await prisma.notification.updateMany({
      where: { companyId: session.companyId, read: false },
      data: { read: true },
    });
  } else if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, companyId: session.companyId },
      data: { read: true },
    });
  }
  return NextResponse.json({ ok: true });
}
