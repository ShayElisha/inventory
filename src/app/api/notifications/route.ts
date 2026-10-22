import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshSystemNotifications } from "@/lib/notifications";

export async function GET() {
  await refreshSystemNotifications();
  const items = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unread = items.filter((n) => !n.read).length;
  return NextResponse.json({ items, unread });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (body.all) {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  } else if (body.id) {
    await prisma.notification.update({
      where: { id: body.id },
      data: { read: true },
    });
  }
  return NextResponse.json({ ok: true });
}
