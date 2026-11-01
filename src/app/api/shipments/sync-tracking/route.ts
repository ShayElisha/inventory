import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canWrite, getSession } from "@/lib/auth";
import { assertModuleApi } from "@/lib/tenant";
import { ensureSchemaPatches } from "@/lib/db";
import { inferTrackingStatus, trackingUrlFor } from "@/lib/carriers";
import { writeAudit } from "@/lib/audit";

/** מרענן סטטוסי מעקב לכל המשלוחים הפתוחים של החברה */
export async function POST(req: NextRequest) {
  await ensureSchemaPatches();
  const gate = await assertModuleApi("shipments");
  if (gate.error) return gate.error;
  const session = gate.session!;
  if (!canWrite(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const onlyId = body.shipmentId ? String(body.shipmentId) : null;

  const list = await prisma.shipment.findMany({
    where: {
      companyId: session.companyId,
      status: { in: ["PACKED", "SHIPPED"] },
      ...(onlyId ? { id: onlyId } : {}),
    },
  });

  let updated = 0;
  for (const s of list) {
    const inferred = inferTrackingStatus({
      status: s.status,
      shippedAt: s.shippedAt,
      deliveredAt: s.deliveredAt,
      webhookStatus: body.webhookStatus || null,
    });
    const url = trackingUrlFor(s.carrier, s.trackingRef);
    const events = safeEvents(s.trackingEventsJson);
    events.push({
      at: new Date().toISOString(),
      status: inferred.trackingStatus,
      source: body.webhookStatus ? "webhook" : "auto",
    });

    const data: Record<string, unknown> = {
      trackingStatus: inferred.trackingStatus,
      trackingUrl: url,
      trackingUpdatedAt: new Date(),
      trackingEventsJson: JSON.stringify(events.slice(-20)),
    };
    if (inferred.shipmentStatus === "DELIVERED") {
      data.status = "DELIVERED";
      data.deliveredAt = s.deliveredAt || new Date();
    }

    await prisma.shipment.update({ where: { id: s.id }, data });
    if (inferred.shipmentStatus === "DELIVERED") {
      await prisma.salesOrder.update({
        where: { id: s.salesOrderId },
        data: { status: "SHIPPED" },
      });
    }
    updated++;
  }

  await writeAudit({
    action: "SYNC_SHIPMENT_TRACKING",
    entityType: "Shipment",
    entityId: onlyId || "bulk",
    details: { updated },
  });

  return NextResponse.json({ ok: true, updated });
}

/** Webhook ציבורי יחסית — עם secret של חברה ב־query או header */
export async function PUT(req: NextRequest) {
  await ensureSchemaPatches();
  const secret =
    req.headers.get("x-sfira-secret") ||
    req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SHIPMENT_WEBHOOK_SECRET) {
    // גם מאפשרים לפי session מחובר
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
    }
  }

  const body = await req.json();
  const trackingRef = String(body.trackingRef || body.tracking || "").trim();
  const status = String(body.status || "").toUpperCase();
  if (!trackingRef || !status) {
    return NextResponse.json({ error: "חסר tracking/status" }, { status: 400 });
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      trackingRef,
      ...(body.companyId ? { companyId: String(body.companyId) } : {}),
    },
  });
  if (!shipment) {
    return NextResponse.json({ error: "משלוח לא נמצא" }, { status: 404 });
  }

  const inferred = inferTrackingStatus({
    status: shipment.status,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
    webhookStatus: status,
  });
  const events = safeEvents(shipment.trackingEventsJson);
  events.push({
    at: new Date().toISOString(),
    status: inferred.trackingStatus,
    source: "carrier_webhook",
    raw: body,
  });

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      trackingStatus: inferred.trackingStatus,
      trackingUpdatedAt: new Date(),
      trackingEventsJson: JSON.stringify(events.slice(-20)),
      ...(inferred.shipmentStatus === "DELIVERED"
        ? { status: "DELIVERED", deliveredAt: new Date() }
        : {}),
    },
  });

  return NextResponse.json(updated);
}

function safeEvents(raw: string | null | undefined) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [] as object[];
  }
}
