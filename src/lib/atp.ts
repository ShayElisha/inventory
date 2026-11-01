import { prisma } from "@/lib/db";

export type AtpLineResult = {
  variantId: string;
  sku: string;
  title: string;
  requested: number;
  onHand: number;
  reserved: number;
  available: number;
  ok: boolean;
  byLocation: { locationId: string; code: string; onHand: number }[];
};

/** Available to Promise — onHand − reserved, לפי יתרות מיקום כשיש */
export async function checkAtp(
  companyId: string,
  lines: { variantId: string; quantity: number }[]
): Promise<{ ok: boolean; results: AtpLineResult[] }> {
  const results: AtpLineResult[] = [];

  for (const line of lines) {
    const qty = Math.max(0, Number(line.quantity) || 0);
    const v = await prisma.productVariant.findFirst({
      where: { id: line.variantId, companyId },
      include: {
        product: { select: { title: true } },
        balances: {
          include: { location: { select: { id: true, code: true } } },
        },
      },
    });
    if (!v) {
      results.push({
        variantId: line.variantId,
        sku: "?",
        title: "לא נמצא",
        requested: qty,
        onHand: 0,
        reserved: 0,
        available: 0,
        ok: false,
        byLocation: [],
      });
      continue;
    }

    const fromBalances = v.balances.reduce((s, b) => s + b.quantityOnHand, 0);
    const onHand = v.balances.length > 0 ? fromBalances : v.quantityOnHand;
    const reserved = v.quantityReserved;
    const available = onHand - reserved;

    results.push({
      variantId: v.id,
      sku: v.sku,
      title: v.product.title,
      requested: qty,
      onHand,
      reserved,
      available,
      ok: available >= qty,
      byLocation: v.balances.map((b) => ({
        locationId: b.locationId,
        code: b.location.code,
        onHand: b.quantityOnHand,
      })),
    });
  }

  return { ok: results.every((r) => r.ok), results };
}
