import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSheetWorkbook, workbookToBuffer } from "@/lib/excel";
import { attributesLabel } from "@/lib/utils";
import { reasonLabel, unitLabel } from "@/lib/constants";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const companyId = session.companyId;
  const type = req.nextUrl.searchParams.get("type") || "catalog";

  if (type === "catalog") {
    const variants = await prisma.productVariant.findMany({
      where: { product: { companyId } },
      include: {
        product: { include: { category: true, supplier: true } },
        location: true,
      },
      orderBy: { sku: "asc" },
    });
    const wb = await createSheetWorkbook(
      "קטלוג",
      [
        "SKU",
        "ברקוד",
        "מוצר",
        "קטגוריה",
        "יחידה",
        "מאפיינים",
        "מלאי",
        "מיקום",
        "עלות",
        "מכירה",
      ],
      variants.map((v) => [
        v.sku,
        v.barcode,
        v.product.title,
        v.product.category.name,
        unitLabel(v.product.unitOfMeasure),
        attributesLabel(v.attributes),
        v.quantityOnHand,
        v.location?.code ?? "",
        v.product.costPrice,
        v.product.sellingPrice,
      ])
    );
    return xlsxResponse(wb, "catalog.xlsx");
  }

  if (type === "customers") {
    const customers = await prisma.customer.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    const wb = await createSheetWorkbook(
      "לקוחות",
      [
        "שם",
        "טלפון",
        "אימייל",
        "כתובת",
        "ח.פ",
        "תקרת אשראי",
        "הערות",
        "פעיל",
      ],
      customers.map((c) => [
        c.name,
        c.phone ?? "",
        c.email ?? "",
        c.address ?? "",
        c.taxId ?? "",
        c.creditLimit ?? "",
        c.notes ?? "",
        c.active ? "1" : "0",
      ])
    );
    return xlsxResponse(wb, "customers.xlsx");
  }

  if (type === "sales-orders") {
    const orders = await prisma.salesOrder.findMany({
      where: { companyId },
      include: {
        lines: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const rows: (string | number)[][] = [];
    for (const o of orders) {
      for (const l of o.lines) {
        rows.push([
          o.number,
          o.status,
          o.customerName,
          o.priority,
          l.variant.sku,
          l.variant.product.title,
          l.qtyOrdered,
          l.qtyFulfilled,
          l.unitPrice,
          o.createdAt.toISOString(),
        ]);
      }
    }
    const wb = await createSheetWorkbook(
      "הזמנות מכירה",
      [
        "הזמנה",
        "סטטוס",
        "לקוח",
        "עדיפות",
        "SKU",
        "מוצר",
        "כמות",
        "סופק",
        "מחיר",
        "תאריך",
      ],
      rows
    );
    return xlsxResponse(wb, "sales-orders.xlsx");
  }

  if (type === "purchase-orders") {
    const orders = await prisma.purchaseOrder.findMany({
      where: { companyId },
      include: {
        supplier: true,
        lines: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const rows: (string | number)[][] = [];
    for (const o of orders) {
      for (const l of o.lines) {
        rows.push([
          o.number,
          o.status,
          o.supplier?.name ?? "",
          l.variant.sku,
          l.variant.product.title,
          l.qtyOrdered,
          l.qtyReceived,
          l.unitCost,
          o.invoiceNumber ?? "",
          o.createdAt.toISOString(),
        ]);
      }
    }
    const wb = await createSheetWorkbook(
      "הזמנות רכש",
      [
        "הזמנה",
        "סטטוס",
        "ספק",
        "SKU",
        "מוצר",
        "הוזמן",
        "נקלט",
        "עלות",
        "חשבונית",
        "תאריך",
      ],
      rows
    );
    return xlsxResponse(wb, "purchase-orders.xlsx");
  }

  // transactions (default fallback)
  const locations = await prisma.warehouseLocation.findMany({
    where: { companyId },
    select: { id: true, code: true },
  });
  const locMap = new Map(locations.map((l) => [l.id, l.code]));

  const txns = await prisma.stockTransaction.findMany({
    where: { variant: { companyId } },
    include: { variant: { include: { product: true } } },
    orderBy: { timestamp: "desc" },
    take: 5000,
  });
  const wb = await createSheetWorkbook(
    "תנועות",
    [
      "תאריך",
      "סוג",
      "SKU",
      "מוצר",
      "שינוי",
      "קודם",
      "יתרה",
      "סיבה",
      "קוד סיבה",
      "ממיקום",
      "למיקום",
      "הזמנת מכירה",
      "הזמנת רכש",
    ],
    txns.map((t) => [
      t.timestamp.toISOString(),
      t.type,
      t.variant.sku,
      t.variant.product.title,
      t.quantityChanged,
      t.previousQuantity,
      t.newQuantity,
      t.reason,
      reasonLabel(t.reasonCode),
      t.fromLocationId ? locMap.get(t.fromLocationId) ?? t.fromLocationId : "",
      t.toLocationId ? locMap.get(t.toLocationId) ?? t.toLocationId : "",
      t.salesOrderId ?? "",
      t.purchaseOrderId ?? "",
    ])
  );
  return xlsxResponse(wb, "transactions.xlsx");
}

async function xlsxResponse(
  wb: Awaited<ReturnType<typeof createSheetWorkbook>>,
  filename: string
) {
  const buf = await workbookToBuffer(wb);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
