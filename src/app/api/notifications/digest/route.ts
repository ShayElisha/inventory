import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAdmin } from "@/lib/auth";
import { sendEmailIfConfigured } from "@/lib/email";
import { renderNotifyTemplate } from "@/lib/notification-templates";
import { getActionQueue } from "@/lib/action-queue";

/**
 * סיכום יומי למייל — ניתן לקרוא מ־cron (Vercel Cron) עם CRON_SECRET
 * או ידנית ע״י אדמין.
 */
async function runDigest(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-vercel-cron");
  const isCron =
    Boolean(cronHeader) ||
    (Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`);

  let companyIds: string[] = [];

  if (isCron) {
    const companies = await prisma.company.findMany({
      where: { active: true, approved: true },
      select: { id: true, name: true },
    });
    companyIds = companies.map((c) => c.id);
  } else {
    const session = await getSession();
    if (!session?.companyId || !canAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    companyIds = [session.companyId];
  }

  const sent: { companyId: string; emails: number }[] = [];

  for (const companyId of companyIds) {
    const company = await prisma.company.findFirst({
      where: { id: companyId },
      select: { name: true },
    });
    const queue = await getActionQueue(companyId);
    const openPicks = queue.find((a) => a.id === "picks");
    const low = queue.find((a) => a.id === "low" || a.id === "reorder");
    const unpaid = queue.find((a) => a.id === "pay");
    const putaway = queue.find((a) => a.id === "putaway");

    const { subject, text } = renderNotifyTemplate("DAILY_DIGEST", {
      companyName: company?.name || "",
      openPicks: openPicks ? openPicks.detail : "0",
      lowStock: low ? low.detail : "0",
      unpaid: unpaid ? unpaid.detail : "0",
      putaway: putaway ? putaway.detail : "0",
      href: "/dashboard",
    });

    const admins = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        email: { not: null },
        active: true,
      },
      select: { email: true },
    });

    let emails = 0;
    for (const a of admins) {
      if (!a.email) continue;
      const r = await sendEmailIfConfigured({
        to: a.email,
        subject,
        text,
        companyId,
      });
      if (r.sent) emails++;
    }

    await prisma.notification.create({
      data: {
        companyId,
        type: "DAILY_DIGEST",
        title: "סיכום יומי",
        body: text.slice(0, 280),
        href: "/dashboard",
      },
    });

    sent.push({ companyId, emails });
  }

  return NextResponse.json({ ok: true, sent });
}

export async function GET(req: NextRequest) {
  return runDigest(req);
}

export async function POST(req: NextRequest) {
  return runDigest(req);
}
