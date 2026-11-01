import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const ALLOWED_TYPES = new Set([
  "PRODUCT",
  "PURCHASE_ORDER",
  "SALES_ORDER",
  "RMA",
  "STOCK_COUNT",
  "GOODS_RECEIPT",
  "STOCK_DOCUMENT",
  "OTHER",
]);

const MAX_BYTES = 2_500_000; // ~2.5MB data-URL

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "חסר entityType/entityId" }, { status: 400 });
  }

  const list = await prisma.attachment.findMany({
    where: {
      companyId: session.companyId,
      entityType: String(entityType),
      entityId: String(entityId),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      url: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json();
  const entityType = String(body.entityType || "").toUpperCase();
  const entityId = String(body.entityId || "").trim();
  const fileName = String(body.fileName || "file").trim().slice(0, 200);
  const mimeType = String(body.mimeType || "application/octet-stream").slice(0, 120);
  const dataUrl = String(body.dataUrl || body.url || "");

  if (!ALLOWED_TYPES.has(entityType) || !entityId) {
    return NextResponse.json({ error: "ישות לא תקינה" }, { status: 400 });
  }
  if (!dataUrl.startsWith("data:") && !dataUrl.startsWith("http")) {
    return NextResponse.json(
      { error: "יש להעלות קובץ (data URL) או קישור" },
      { status: 400 }
    );
  }
  if (dataUrl.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מקסימום ~1.8MB)" },
      { status: 400 }
    );
  }

  const sizeBytes =
    Number(body.sizeBytes) ||
    Math.max(0, Math.floor((dataUrl.length * 3) / 4));

  const created = await prisma.attachment.create({
    data: {
      companyId: session.companyId,
      entityType,
      entityId,
      fileName,
      mimeType,
      sizeBytes,
      storageKey: `inline/${session.companyId}/${Date.now()}`,
      url: dataUrl,
      uploadedById: session.id,
    },
  });

  await writeAudit({
    action: "UPLOAD_ATTACHMENT",
    entityType: "Attachment",
    entityId: created.id,
    details: { entityType, parentEntityId: entityId, fileName },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "חסר id" }, { status: 400 });
  }
  const existing = await prisma.attachment.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
