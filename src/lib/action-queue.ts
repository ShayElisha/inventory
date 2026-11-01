import { prisma } from "@/lib/db";
import { getCompanyModules } from "@/lib/tenant";

export type ActionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: "danger" | "warn" | "accent" | "default";
};

/** תור «מה לעשות עכשיו» לדשבורד */
export async function getActionQueue(companyId: string): Promise<ActionItem[]> {
  const modules = await getCompanyModules(companyId);
  const items: ActionItem[] = [];

  const [openPicks, openCounts, pendingPutaway, unpaidInvoices, lowStock, reorderNeeded] =
    await Promise.all([
      modules.pick
        ? prisma.pickList.count({
            where: {
              companyId,
              status: { in: ["OPEN", "IN_PROGRESS"] },
            },
          })
        : Promise.resolve(0),
      prisma.stockCountSession.count({
        where: { companyId, status: "OPEN" },
      }),
      modules.inbound
        ? prisma.goodsReceiptLine.count({
            where: {
              putawayStatus: "PENDING",
              qtyReceived: { gt: 0 },
              receipt: { companyId },
            },
          })
        : Promise.resolve(0),
      modules.sales
        ? prisma.stockDocument.count({
            where: {
              companyId,
              type: "INVOICE",
              paymentStatus: { in: ["UNPAID", "PARTIAL"] },
            },
          })
        : Promise.resolve(0),
      prisma.productVariant.count({
        where: {
          companyId,
          // Prisma לא משווה שדות — נטען בהמשך אם צריך; כאן קירוב דרך raw לא
        },
      }).then(async () => {
        const variants = await prisma.productVariant.findMany({
          where: { companyId },
          select: { quantityOnHand: true, minAlertLevel: true },
        });
        return variants.filter((v) => v.quantityOnHand <= v.minAlertLevel).length;
      }),
      modules.reorder
        ? prisma.reorderRule.findMany({
            where: { companyId, active: true },
            include: { variant: { select: { quantityOnHand: true } } },
          }).then((rules) =>
            rules.filter((r) => r.variant.quantityOnHand <= r.minQty).length
          )
        : Promise.resolve(0),
    ]);

  if (openPicks > 0) {
    items.push({
      id: "picks",
      title: "ליקוטים פתוחים",
      detail: `${openPicks} רשימות ממתינות לביצוע`,
      href: "/picks",
      cta: "לליקוט",
      tone: "warn",
    });
  }
  if (pendingPutaway > 0) {
    items.push({
      id: "putaway",
      title: "השמה למדף",
      detail: `${pendingPutaway} שורות אחרי קליטה בלי מיקום`,
      href: "/putaway",
      cta: "השמה",
      tone: "accent",
    });
  }
  if (reorderNeeded > 0) {
    items.push({
      id: "reorder",
      title: "רכש מומלץ",
      detail: `${reorderNeeded} פריטים מתחת למינימום — צרו PO`,
      href: "/reorder",
      cta: "להצעות",
      tone: "danger",
    });
  } else if (lowStock > 0) {
    items.push({
      id: "low",
      title: "מלאי נמוך",
      detail: `${lowStock} SKUs מתחת לסף התראה`,
      href: "/products?lowStock=1",
      cta: "לקטלוג",
      tone: "danger",
    });
  }
  if (unpaidInvoices > 0) {
    items.push({
      id: "pay",
      title: "גבייה",
      detail: `${unpaidInvoices} חשבוניות עם יתרת חוב`,
      href: "/documents?payment=open",
      cta: "למסמכים",
      tone: "warn",
    });
  }
  if (openCounts > 0) {
    items.push({
      id: "counts",
      title: "ספירות פתוחות",
      detail: `${openCounts} ספירות לא הושלמו`,
      href: "/counts",
      cta: "לספירה",
      tone: "default",
    });
  }

  return items;
}
