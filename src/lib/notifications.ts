import { prisma } from "@/lib/db";

/** מרענן התראות מערכתיות (מלאי נמוך וכו׳) לחברה */
export async function refreshSystemNotifications(companyId: string) {
  const low = await prisma.productVariant.findMany({
    where: { product: { companyId } },
    include: { product: true },
  });
  const lowItems = low.filter((v) => v.quantityOnHand <= v.minAlertLevel);

  for (const v of lowItems.slice(0, 50)) {
    const existing = await prisma.notification.findFirst({
      where: {
        companyId,
        type: "LOW_STOCK",
        href: `/products?q=${encodeURIComponent(v.sku)}`,
        read: false,
      },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        companyId,
        type: "LOW_STOCK",
        title: "מלאי נמוך",
        body: `${v.product.title} (${v.sku}) — ${v.quantityOnHand} יח׳ (מינ׳ ${v.minAlertLevel})`,
        href: `/products`,
      },
    });
  }

  const openCounts = await prisma.stockCountSession.findMany({
    where: { companyId, status: "OPEN" },
    take: 10,
  });
  for (const c of openCounts) {
    const existing = await prisma.notification.findFirst({
      where: {
        companyId,
        type: "COUNT_OPEN",
        href: `/counts/${c.id}`,
        read: false,
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          companyId,
          type: "COUNT_OPEN",
          title: "ספירה פתוחה",
          body: c.name,
          href: `/counts/${c.id}`,
        },
      });
    }
  }

  const openPicks = await prisma.pickList.findMany({
    where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    take: 10,
  });
  for (const p of openPicks) {
    const existing = await prisma.notification.findFirst({
      where: {
        companyId,
        type: "PICK_READY",
        href: `/picks/${p.id}`,
        read: false,
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          companyId,
          type: "PICK_READY",
          title: "רשימת ליקוט ממתינה",
          body: p.reference,
          href: `/picks/${p.id}`,
        },
      });
    }
  }
}
