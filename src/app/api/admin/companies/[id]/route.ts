import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isSuperAdmin, slugifyCompany } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, slug: { not: "platform" } },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          products: true,
          locations: true,
          categories: true,
          suppliers: true,
          pickLists: true,
          stockCounts: true,
        },
      },
    },
  });
  if (!company) {
    return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
  }
  return NextResponse.json(company);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.company.findFirst({
      where: { id, slug: { not: "platform" } },
    });
    if (!existing) {
      return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
    }

    const body = await req.json();
    const data: {
      name?: string;
      phone?: string | null;
      active?: boolean;
      approved?: boolean;
      slug?: string;
    } = {};

    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "שם חברה חובה" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.phone !== undefined) {
      data.phone = body.phone ? String(body.phone).trim() : null;
    }
    if (body.approved !== undefined) {
      data.approved = Boolean(body.approved);
      if (data.approved) data.active = true;
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
      // הפעלה מחדש / אישור ממתינה — מאשרים גם את החברה
      if (data.active) data.approved = true;
    }
    if (body.slug != null) {
      let slug = slugifyCompany(String(body.slug));
      if (slug === "platform") {
        return NextResponse.json({ error: "slug שמור למערכת" }, { status: 400 });
      }
      const taken = await prisma.company.findFirst({
        where: { slug, id: { not: id } },
      });
      if (taken) {
        return NextResponse.json({ error: "slug כבר בשימוש" }, { status: 400 });
      }
      data.slug = slug;
    }

    const company = await prisma.company.update({ where: { id }, data });

    await writeAudit({
      action: "ADMIN_UPDATE_COMPANY",
      entityType: "Company",
      entityId: id,
      userId: session.id,
      details: data,
    });

    return NextResponse.json(company);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה בעדכון חברה" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.company.findFirst({
      where: { id, slug: { not: "platform" } },
    });
    if (!existing) {
      return NextResponse.json({ error: "חברה לא נמצאה" }, { status: 404 });
    }

    await prisma.company.delete({ where: { id } });

    await writeAudit({
      action: "ADMIN_DELETE_COMPANY",
      entityType: "Company",
      entityId: id,
      userId: session.id,
      details: { name: existing.name, slug: existing.slug },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "שגיאה במחיקת חברה" }, { status: 400 });
  }
}
