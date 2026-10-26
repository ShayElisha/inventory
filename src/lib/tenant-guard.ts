import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canWrite, SessionUser } from "@/lib/auth";

export async function requireWriteSession(): Promise<
  | { session: SessionUser; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session?.companyId) {
    return {
      session: null,
      error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }),
    };
  }
  if (!canWrite(session.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export async function requireSessionCompany(): Promise<
  | { session: SessionUser; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session?.companyId) {
    return {
      session: null,
      error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/** מוודא שכל ה־variants שייכים לחברה */
export async function assertVariantsOwned(
  companyId: string,
  variantIds: string[]
): Promise<boolean> {
  const ids = [...new Set(variantIds.filter(Boolean))];
  if (!ids.length) return false;
  const count = await prisma.productVariant.count({
    where: { id: { in: ids }, companyId },
  });
  return count === ids.length;
}

export async function assertLocationsOwned(
  companyId: string,
  locationIds: Array<string | null | undefined>
): Promise<boolean> {
  const ids = [...new Set(locationIds.filter((x): x is string => Boolean(x)))];
  if (!ids.length) return true;
  const count = await prisma.warehouseLocation.count({
    where: { id: { in: ids }, companyId },
  });
  return count === ids.length;
}

export async function assertWarehousesOwned(
  companyId: string,
  warehouseIds: Array<string | null | undefined>
): Promise<boolean> {
  const ids = [...new Set(warehouseIds.filter((x): x is string => Boolean(x)))];
  if (!ids.length) return true;
  const count = await prisma.warehouse.count({
    where: { id: { in: ids }, companyId },
  });
  return count === ids.length;
}

export async function assertSupplierOwned(
  companyId: string,
  supplierId: string | null | undefined
): Promise<boolean> {
  if (!supplierId) return true;
  const row = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function assertPriceListOwned(
  companyId: string,
  priceListId: string | null | undefined
): Promise<boolean> {
  if (!priceListId) return true;
  const row = await prisma.priceList.findFirst({
    where: { id: priceListId, companyId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function assertTransactionOwned(
  companyId: string,
  transactionId: string
) {
  return prisma.stockTransaction.findFirst({
    where: {
      id: transactionId,
      variant: { companyId },
    },
    include: { variant: { include: { product: true } } },
  });
}

export function forbiddenTenant(message = "פריט לא שייך לחברה") {
  return NextResponse.json({ error: message }, { status: 403 });
}
