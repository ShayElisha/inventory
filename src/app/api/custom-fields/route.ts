import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, canAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  CUSTOM_FIELD_TYPES,
  fieldKeyFromLabel,
} from "@/lib/custom-fields";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  const fields = await prisma.customField.findMany({
    where: {
      companyId: session.companyId,
      entityType: "PRODUCT",
      active: true,
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId || !canAdmin(session.role)) {
    return NextResponse.json(
      { error: "רק מנהל יכול להגדיר שדות מותאמים" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const label = String(body.label || "").trim();
  const fieldType = String(body.fieldType || "TEXT");
  const required = Boolean(body.required);
  const categoryIdRaw = body.categoryId;
  const categoryId =
    categoryIdRaw === null ||
    categoryIdRaw === undefined ||
    categoryIdRaw === ""
      ? null
      : String(categoryIdRaw);
  const optionsRaw = Array.isArray(body.options)
    ? body.options.map(String).filter(Boolean)
    : String(body.optionsText || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  if (!label) {
    return NextResponse.json({ error: "שם שדה חובה" }, { status: 400 });
  }
  if (!CUSTOM_FIELD_TYPES.some((t) => t.code === fieldType)) {
    return NextResponse.json({ error: "סוג שדה לא חוקי" }, { status: 400 });
  }
  if (fieldType === "SELECT" && optionsRaw.length === 0) {
    return NextResponse.json(
      { error: "לשדה בחירה יש להזין לפחות אפשרות אחת" },
      { status: 400 }
    );
  }

  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, companyId: session.companyId },
    });
    if (!cat) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 400 });
    }
  }

  let key = String(body.key || "").trim() || fieldKeyFromLabel(label);
  key = key.replace(/\s+/g, "_").slice(0, 40);
  if (!key) key = `field_${Date.now().toString(36)}`;

  const taken = await prisma.customField.findFirst({
    where: {
      companyId: session.companyId,
      entityType: "PRODUCT",
      key,
      active: true,
    },
  });
  if (taken) {
    return NextResponse.json(
      { error: "מפתח שדה כבר קיים — בחרו שם אחר" },
      { status: 400 }
    );
  }

  const maxSort = await prisma.customField.aggregate({
    where: { companyId: session.companyId, entityType: "PRODUCT" },
    _max: { sortOrder: true },
  });

  const field = await prisma.customField.create({
    data: {
      companyId: session.companyId,
      categoryId,
      entityType: "PRODUCT",
      key,
      label,
      fieldType,
      options: JSON.stringify(fieldType === "SELECT" ? optionsRaw : []),
      required,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  await writeAudit({
    action: "CREATE_CUSTOM_FIELD",
    entityType: "CustomField",
    entityId: field.id,
    details: { key, label, fieldType, categoryId },
  });

  return NextResponse.json(field, { status: 201 });
}
