import { prisma } from "@/lib/db";

/** מרענן התראות מערכתיות (מלאי נמוך וכו׳) */
export async function refreshSystemNotifications() {
  const low = await prisma.productVariant.findMany({
    include: { product: true },
  });
  const lowItems = low.filter((v) => v.quantityOnHand <= v.minAlertLevel);

  for (const v of lowItems.slice(0, 50)) {
    const existing = await prisma.notification.findFirst({
      where: {
        type: "LOW_STOCK",
        href: `/products?q=${encodeURIComponent(v.sku)}`,
        read: false,
      },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        type: "LOW_STOCK",
        title: "מלאי נמוך",
        body: `${v.product.title} (${v.sku}) — ${v.quantityOnHand} יח׳ (מינ׳ ${v.minAlertLevel})`,
        href: `/products`,
      },
    });
  }

  const openCounts = await prisma.stockCountSession.findMany({
    where: { status: "OPEN" },
    take: 10,
  });
  for (const c of openCounts) {
    const existing = await prisma.notification.findFirst({
      where: { type: "COUNT_OPEN", href: `/counts/${c.id}`, read: false },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          type: "COUNT_OPEN",
          title: "ספירה פתוחה",
          body: c.name,
          href: `/counts/${c.id}`,
        },
      });
    }
  }

  const openPicks = await prisma.pickList.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    take: 10,
  });
  for (const p of openPicks) {
    const existing = await prisma.notification.findFirst({
      where: { type: "PICK_READY", href: `/picks/${p.id}`, read: false },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          type: "PICK_READY",
          title: "רשימת ליקוט ממתינה",
          body: p.reference,
          href: `/picks/${p.id}`,
        },
      });
    }
  }
}
