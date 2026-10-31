import { prisma } from "@/lib/db";

/** מחזיר מחסן ברירת מחדל; יוצר «ראשי» אם אין אף מחסן לחברה */
export async function ensureDefaultWarehouse(companyId: string) {
  const existing = await prisma.warehouse.findFirst({
    where: { companyId, active: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (existing) {
    if (!existing.isDefault) {
      const hasDefault = await prisma.warehouse.findFirst({
        where: { companyId, isDefault: true },
      });
      if (!hasDefault) {
        await prisma.warehouse.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
        return { ...existing, isDefault: true };
      }
    }
    return existing;
  }

  const created = await prisma.warehouse.create({
    data: {
      companyId,
      name: "ראשי",
      code: "MAIN",
      isDefault: true,
      active: true,
    },
  });

  await prisma.warehouseLocation.updateMany({
    where: { companyId, warehouseId: null },
    data: { warehouseId: created.id },
  });

  return created;
}

export async function setDefaultWarehouse(
  companyId: string,
  warehouseId: string
) {
  await prisma.$transaction([
    prisma.warehouse.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.warehouse.update({
      where: { id: warehouseId },
      data: { isDefault: true, active: true },
    }),
  ]);
}
