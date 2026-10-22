import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function writeAudit(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
  ip?: string | null;
  userId?: string | null;
}) {
  const session = params.userId !== undefined ? null : await getSession();
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      details: JSON.stringify(params.details ?? {}),
      ip: params.ip || null,
      userId: params.userId ?? session?.id ?? null,
    },
  });
}

export async function logProductChange(params: {
  productId: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  userId?: string | null;
}) {
  const session = params.userId ? null : await getSession();
  await prisma.productChangeLog.create({
    data: {
      productId: params.productId,
      field: params.field,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      userId: params.userId ?? session?.id ?? null,
    },
  });
}
