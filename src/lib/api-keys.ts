import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey() {
  const raw = `sfira_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix, hash: hashApiKey(raw) };
}

export async function resolveApiKey(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const raw = authorization.slice(7).trim();
  if (!raw.startsWith("sfira_")) return null;
  const prefix = raw.slice(0, 12);
  const hash = hashApiKey(raw);
  const key = await prisma.apiKey.findFirst({
    where: { keyPrefix: prefix, keyHash: hash, active: true },
    include: { company: { select: { id: true, name: true, active: true, approved: true } } },
  });
  if (!key || !key.company.active || !key.company.approved) return null;
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return { companyId: key.companyId, companyName: key.company.name, apiKeyId: key.id };
}
