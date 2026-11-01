import { prisma } from "@/lib/db";
import { sendEmailIfConfigured } from "@/lib/email";
import { renderNotifyTemplate } from "@/lib/notification-templates";

const LOW_STOCK_HREF = "/products?lowStock=1";
/** לא ליצור שוב התראת מלאי נמוך אם כבר הייתה (גם נקראה) בחלון הזה */
const LOW_STOCK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function notifyAdminsByEmail(
  companyId: string,
  templateId: Parameters<typeof renderNotifyTemplate>[0],
  vars: Record<string, string | number>
) {
  const { subject, text } = renderNotifyTemplate(templateId, vars);
  const admins = await prisma.user.findMany({
    where: {
      companyId,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      email: { not: null },
    },
    select: { email: true },
    take: 10,
  });
  for (const a of admins) {
    if (!a.email) continue;
    void sendEmailIfConfigured({
      to: a.email,
      subject,
      text,
      html: text.replace(/\n/g, "<br/>"),
      companyId,
    });
  }
}

/** מרענן התראות מערכתיות — בלי חזרתיות על אותן הודעות */
export async function refreshSystemNotifications(companyId: string) {
  await refreshLowStockSummary(companyId);
  await refreshOpenCounts(companyId);
  await refreshOpenPicks(companyId);
  await refreshReorderNeeded(companyId);
  await refreshPutawayPending(companyId);
  await refreshUnpaidInvoices(companyId);
}

async function refreshLowStockSummary(companyId: string) {
  const variants = await prisma.productVariant.findMany({
    where: { companyId },
    select: {
      id: true,
      sku: true,
      quantityOnHand: true,
      minAlertLevel: true,
      product: { select: { title: true } },
    },
  });
  const lowItems = variants.filter((v) => v.quantityOnHand <= v.minAlertLevel);
  const now = Date.now();
  const cooldownSince = new Date(now - LOW_STOCK_COOLDOWN_MS);

  // מנקים כפילויות ישנות של מלאי נמוך (מהבאג הקודם) — משאירים לכל היותר אחת אחרונה
  const allLow = await prisma.notification.findMany({
    where: { companyId, type: "LOW_STOCK" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (allLow.length > 1) {
    await prisma.notification.deleteMany({
      where: {
        id: { in: allLow.slice(1).map((n) => n.id) },
      },
    });
  }

  if (lowItems.length === 0) {
    await prisma.notification.updateMany({
      where: { companyId, type: "LOW_STOCK", read: false },
      data: { read: true },
    });
    return;
  }

  const sample = lowItems
    .slice(0, 3)
    .map((v) => v.product.title)
    .join(", ");
  const more =
    lowItems.length > 3 ? ` ועוד ${lowItems.length - 3}` : "";
  const body =
    lowItems.length === 1
      ? `${lowItems[0].product.title} (${lowItems[0].sku}) — ${lowItems[0].quantityOnHand} יח׳ (מינ׳ ${lowItems[0].minAlertLevel})`
      : `${lowItems.length} פריטים במלאי נמוך: ${sample}${more}`;

  const latest = await prisma.notification.findFirst({
    where: { companyId, type: "LOW_STOCK" },
    orderBy: { createdAt: "desc" },
  });

  if (latest && !latest.read) {
    // מעדכנים את ההתראה הפתוחה במקום ליצור עוד אחת
    await prisma.notification.update({
      where: { id: latest.id },
      data: {
        title: "מלאי נמוך",
        body,
        href: LOW_STOCK_HREF,
      },
    });
    return;
  }

  if (latest && latest.createdAt >= cooldownSince) {
    // כבר הייתה התראה ב־24 השעות האחרונות — לא חוזרים על אותה הודעה
    return;
  }

  await prisma.notification.create({
    data: {
      companyId,
      type: "LOW_STOCK",
      title: "מלאי נמוך",
      body,
      href: LOW_STOCK_HREF,
    },
  });
}

async function refreshOpenCounts(companyId: string) {
  const openCounts = await prisma.stockCountSession.findMany({
    where: { companyId, status: "OPEN" },
    take: 10,
  });
  const openIds = new Set(openCounts.map((c) => c.id));

  // סוגרים התראות לספירות שכבר לא פתוחות
  const stale = await prisma.notification.findMany({
    where: { companyId, type: "COUNT_OPEN", read: false },
  });
  for (const n of stale) {
    const id = n.href?.split("/").pop();
    if (id && !openIds.has(id)) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { read: true },
      });
    }
  }

  for (const c of openCounts) {
    const href = `/counts/${c.id}`;
    const existing = await prisma.notification.findFirst({
      where: { companyId, type: "COUNT_OPEN", href },
      orderBy: { createdAt: "desc" },
    });
    if (existing && !existing.read) continue;
    if (existing?.read) continue; // כבר הודיעו על הספירה הזו
    await prisma.notification.create({
      data: {
        companyId,
        type: "COUNT_OPEN",
        title: "ספירה פתוחה",
        body: c.name,
        href,
      },
    });
  }
}

async function refreshOpenPicks(companyId: string) {
  const openPicks = await prisma.pickList.findMany({
    where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    select: { id: true, reference: true },
    take: 10,
  });
  const openIds = new Set(openPicks.map((p) => p.id));

  const stale = await prisma.notification.findMany({
    where: { companyId, type: "PICK_READY", read: false },
  });
  for (const n of stale) {
    const id = n.href?.split("/").pop();
    if (id && !openIds.has(id)) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { read: true },
      });
    }
  }

  for (const p of openPicks) {
    const href = `/picks/${p.id}`;
    const existing = await prisma.notification.findFirst({
      where: { companyId, type: "PICK_READY", href },
      orderBy: { createdAt: "desc" },
    });
    if (existing) continue; // כבר הודיעו — לא חוזרים
    await prisma.notification.create({
      data: {
        companyId,
        type: "PICK_READY",
        title: "רשימת ליקוט ממתינה",
        body: p.reference,
        href,
      },
    });
  }
}

async function refreshReorderNeeded(companyId: string) {
  const rules = await prisma.reorderRule.findMany({
    where: { companyId, active: true },
    include: {
      variant: { select: { quantityOnHand: true, sku: true } },
    },
  });
  const needed = rules.filter((r) => r.variant.quantityOnHand <= r.minQty);
  const href = "/reorder";

  if (needed.length === 0) {
    await prisma.notification.updateMany({
      where: { companyId, type: "REORDER", read: false },
      data: { read: true },
    });
    return;
  }

  const body = `${needed.length} פריטים דורשים רכש — צרו PO מהצעות`;
  const latest = await prisma.notification.findFirst({
    where: { companyId, type: "REORDER" },
    orderBy: { createdAt: "desc" },
  });
  if (latest && !latest.read) {
    await prisma.notification.update({
      where: { id: latest.id },
      data: { title: "הצעות רכש ממתינות", body, href },
    });
    return;
  }
  if (latest && Date.now() - latest.createdAt.getTime() < 12 * 60 * 60 * 1000) {
    return;
  }
  await prisma.notification.create({
    data: {
      companyId,
      type: "REORDER",
      title: "הצעות רכש ממתינות",
      body,
      href,
    },
  });
  void notifyAdminsByEmail(companyId, "REORDER", {
    detail: body,
    href: href,
  });
}

async function refreshPutawayPending(companyId: string) {
  const count = await prisma.goodsReceiptLine.count({
    where: {
      putawayStatus: "PENDING",
      qtyReceived: { gt: 0 },
      receipt: { companyId },
    },
  });
  const href = "/putaway";
  if (count === 0) {
    await prisma.notification.updateMany({
      where: { companyId, type: "PUTAWAY", read: false },
      data: { read: true },
    });
    return;
  }
  const body = `${count} שורות ממתינות להשמה למדף`;
  const latest = await prisma.notification.findFirst({
    where: { companyId, type: "PUTAWAY", href },
    orderBy: { createdAt: "desc" },
  });
  if (latest && !latest.read) {
    await prisma.notification.update({
      where: { id: latest.id },
      data: { title: "השמה למדף", body, href },
    });
    return;
  }
  if (latest) return;
  await prisma.notification.create({
    data: {
      companyId,
      type: "PUTAWAY",
      title: "השמה למדף",
      body,
      href,
    },
  });
}

async function refreshUnpaidInvoices(companyId: string) {
  const unpaid = await prisma.stockDocument.count({
    where: {
      companyId,
      type: "INVOICE",
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
  });
  const href = "/documents?payment=open";
  if (unpaid === 0) {
    await prisma.notification.updateMany({
      where: { companyId, type: "PAYMENT_DUE", read: false },
      data: { read: true },
    });
    return;
  }
  const body = `${unpaid} חשבוניות עם יתרת חוב`;
  const latest = await prisma.notification.findFirst({
    where: { companyId, type: "PAYMENT_DUE" },
    orderBy: { createdAt: "desc" },
  });
  if (latest && !latest.read) {
    await prisma.notification.update({
      where: { id: latest.id },
      data: { title: "גבייה ממתינה", body, href },
    });
    return;
  }
  if (latest && Date.now() - latest.createdAt.getTime() < 24 * 60 * 60 * 1000) {
    return;
  }
  await prisma.notification.create({
    data: {
      companyId,
      type: "PAYMENT_DUE",
      title: "גבייה ממתינה",
      body,
      href,
    },
  });
  void notifyAdminsByEmail(companyId, "PAYMENT_DUE", {
    detail: body,
    href,
  });
}
