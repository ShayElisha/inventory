import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAdmin, canWrite, type SessionUser } from "@/lib/auth";
import {
  hasPermission,
  type PermissionKey,
} from "@/lib/permissions";

const cache = new Map<string, { json: string | null; at: number }>();
const TTL = 30_000;

async function loadPermissionsJson(userId: string) {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.json;
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { permissionsJson: true },
  });
  const json = user?.permissionsJson ?? null;
  cache.set(userId, { json, at: Date.now() });
  return json;
}

/** בודק הרשאה דקה; ADMIN/SUPER_ADMIN תמיד עוברים */
export async function assertPermission(
  session: SessionUser,
  key: PermissionKey
): Promise<{ ok: true } | { ok: false; error: NextResponse }> {
  if (canAdmin(session.role)) return { ok: true };
  const json = await loadPermissionsJson(session.id);
  if (hasPermission(session.role, key, json)) return { ok: true };
  // תאימות לאחור: בלי override — canWrite מכסה stock/sales/purchases ל־WAREHOUSE
  if (
    !json &&
    canWrite(session.role) &&
    (key === "stock.write" ||
      key === "sales.write" ||
      key === "purchases.write" ||
      key === "shipments.write")
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    error: NextResponse.json(
      { error: "אין הרשאה לפעולה זו", code: "FORBIDDEN_PERMISSION", key },
      { status: 403 }
    ),
  };
}

export function clearPermissionCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
