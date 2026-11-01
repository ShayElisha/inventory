import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAdmin, getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { generateApiKey } from "@/lib/api-keys";
import { writeAudit } from "@/lib/audit";
import { ensureSchemaPatches } from "@/lib/db";

async function gate() {
  await ensureSchemaPatches();
  const session = await getSession();
  if (!session?.companyId) {
    return { error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }) };
  }
  const user = await prisma.user.findFirst({
    where: { id: session.id },
    select: { permissionsJson: true, role: true },
  });
  const ok =
    canAdmin(session.role) ||
    hasPermission(session.role, "integrations.manage", user?.permissionsJson);
  if (!ok) {
    return { error: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const g = await gate();
  if (g.error) return g.error;
  const session = g.session!;

  const [apiKeys, webhooks, integrations] = await Promise.all([
    prisma.apiKey.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        active: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
    prisma.webhookEndpoint.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.integration.findMany({
      where: { companyId: session.companyId },
    }),
  ]);

  return NextResponse.json({ apiKeys, webhooks, integrations });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if (g.error) return g.error;
  const session = g.session!;
  const body = await req.json();
  const kind = String(body.kind || "");

  if (kind === "api-key") {
    const { raw, prefix, hash } = generateApiKey();
    const created = await prisma.apiKey.create({
      data: {
        companyId: session.companyId,
        name: String(body.name || "API Key").slice(0, 80),
        keyPrefix: prefix,
        keyHash: hash,
      },
    });
    await writeAudit({
      action: "CREATE_API_KEY",
      entityType: "ApiKey",
      entityId: created.id,
    });
    return NextResponse.json(
      { ...created, rawKey: raw },
      { status: 201 }
    );
  }

  if (kind === "webhook") {
    const url = String(body.url || "").trim();
    if (!url.startsWith("http")) {
      return NextResponse.json({ error: "URL לא תקין" }, { status: 400 });
    }
    const created = await prisma.webhookEndpoint.create({
      data: {
        companyId: session.companyId,
        url,
        secret: body.secret ? String(body.secret) : null,
        events: JSON.stringify(
          Array.isArray(body.events)
            ? body.events
            : ["stock.changed", "order.created", "shipment.updated"]
        ),
      },
    });
    return NextResponse.json(created, { status: 201 });
  }

  if (kind === "shopify") {
    const shop = String(body.shop || "").trim().replace(/^https?:\/\//, "");
    const accessToken = String(body.accessToken || "").trim();
    if (!shop || !accessToken) {
      return NextResponse.json(
        { error: "נדרשים shop ו־accessToken" },
        { status: 400 }
      );
    }
    const integration = await prisma.integration.upsert({
      where: {
        companyId_provider: {
          companyId: session.companyId,
          provider: "SHOPIFY",
        },
      },
      create: {
        companyId: session.companyId,
        provider: "SHOPIFY",
        configJson: JSON.stringify({ shop, accessToken }),
        active: true,
      },
      update: {
        configJson: JSON.stringify({ shop, accessToken }),
        active: true,
      },
    });
    return NextResponse.json({
      id: integration.id,
      provider: integration.provider,
      active: integration.active,
      shop,
    });
  }

  return NextResponse.json({ error: "סוג לא נתמך" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const g = await gate();
  if (g.error) return g.error;
  const session = g.session!;
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type");
  if (!id || !type) {
    return NextResponse.json({ error: "חסר id/type" }, { status: 400 });
  }
  if (type === "api-key") {
    await prisma.apiKey.deleteMany({
      where: { id, companyId: session.companyId },
    });
  } else if (type === "webhook") {
    await prisma.webhookEndpoint.deleteMany({
      where: { id, companyId: session.companyId },
    });
  } else if (type === "integration") {
    await prisma.integration.deleteMany({
      where: { id, companyId: session.companyId },
    });
  }
  return NextResponse.json({ ok: true });
}
