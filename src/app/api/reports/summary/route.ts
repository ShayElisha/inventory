import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

function periodStart(period: string) {
  const now = new Date();
  if (period === "week") return startOfWeek(now, { weekStartsOn: 0 });
  if (period === "month") return startOfMonth(now);
  if (period === "compare") return subDays(now, 14);
  return startOfDay(now);
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") || "today";
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const deadDays = Number(req.nextUrl.searchParams.get("deadDays") || 30);

  const from = fromParam ? new Date(fromParam) : periodStart(period);
  const to = toParam ? new Date(toParam) : new Date();

  const [txns, variants, categories] = await Promise.all([
    prisma.stockTransaction.findMany({
      where: { timestamp: { gte: from, lte: to } },
      include: { variant: { include: { product: { include: { category: true } } } } },
    }),
    prisma.productVariant.findMany({
      include: {
        product: { include: { category: true } },
        transactions: { orderBy: { timestamp: "desc" }, take: 1 },
      },
    }),
    prisma.category.findMany({
      include: { products: { include: { variants: true } } },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const t of txns) {
    byType[t.type] = (byType[t.type] || 0) + Math.abs(t.quantityChanged);
  }

  const outbound = txns.filter((t) => t.type === "OUTBOUND");
  const topMap = new Map<string, { sku: string; title: string; qty: number }>();
  for (const t of outbound) {
    const key = t.variantId;
    const cur = topMap.get(key) || {
      sku: t.variant.sku,
      title: t.variant.product.title,
      qty: 0,
    };
    cur.qty += Math.abs(t.quantityChanged);
    topMap.set(key, cur);
  }
  const top20 = [...topMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 20);

  const waste = txns.filter(
    (t) => t.reasonCode === "WASTE" || t.reasonCode === "DAMAGE"
  );

  const valueByCategory = categories.map((c) => {
    let cost = 0;
    let sell = 0;
    let qty = 0;
    for (const p of c.products) {
      for (const v of p.variants) {
        qty += v.quantityOnHand;
        cost += v.quantityOnHand * p.costPrice;
        sell += v.quantityOnHand * p.sellingPrice;
      }
    }
    return { name: c.name, qty, cost, sell };
  });

  const deadCutoff = subDays(new Date(), deadDays);
  const deadStock = variants
    .filter((v) => {
      const last = v.transactions[0]?.timestamp;
      return !last || last < deadCutoff;
    })
    .map((v) => ({
      sku: v.sku,
      title: v.product.title,
      qty: v.quantityOnHand,
      lastMovement: v.transactions[0]?.timestamp || null,
    }));

  // daily trend of on-hand change
  const trendMap = new Map<string, number>();
  for (const t of txns) {
    const day = t.timestamp.toISOString().slice(0, 10);
    trendMap.set(day, (trendMap.get(day) || 0) + t.quantityChanged);
  }
  const trend = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, delta]) => ({ day, delta }));

  // compare periods: current window vs previous equal window
  const windowMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - windowMs);
  const prevTxns = await prisma.stockTransaction.findMany({
    where: { timestamp: { gte: prevFrom, lt: prevTo } },
  });
  const sumAbs = (arr: { quantityChanged: number }[]) =>
    arr.reduce((s, t) => s + Math.abs(t.quantityChanged), 0);

  const closedCounts = await prisma.stockCountSession.findMany({
    where: { status: "CLOSED" },
    include: { lines: true },
    orderBy: { closedAt: "desc" },
    take: 20,
  });
  const accuracy = closedCounts.map((c) => {
    const total = c.lines.length || 1;
    const exact = c.lines.filter((l) => (l.variance ?? 0) === 0).length;
    const withCount = c.lines.filter((l) => l.countedQty != null).length || 1;
    return {
      id: c.id,
      name: c.name,
      accuracyPct: Math.round((exact / withCount) * 100),
      lines: total,
      exact,
    };
  });

  return NextResponse.json({
    from,
    to,
    byType,
    top20,
    waste: waste.map((t) => ({
      sku: t.variant.sku,
      title: t.variant.product.title,
      qty: Math.abs(t.quantityChanged),
      reason: t.reason,
      reasonCode: t.reasonCode,
      at: t.timestamp,
    })),
    valueByCategory,
    deadStock,
    trend,
    compare: {
      currentAbs: sumAbs(txns),
      previousAbs: sumAbs(prevTxns),
      prevFrom,
      prevTo,
    },
    accuracy,
    movements: txns.slice(0, 500).map((t) => ({
      id: t.id,
      type: t.type,
      sku: t.variant.sku,
      title: t.variant.product.title,
      qty: t.quantityChanged,
      reason: t.reason,
      reasonCode: t.reasonCode,
      at: t.timestamp,
    })),
  });
}
