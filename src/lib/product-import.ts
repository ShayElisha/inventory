import { prisma } from "@/lib/db";
import { stringifyJson } from "@/lib/json";
import { UNIT_OF_MEASURE } from "@/lib/constants";
import { GLOBAL_CATEGORY_ATTRIBUTES } from "@/lib/category-attributes";

export type ImportProductRow = {
  title: string;
  baseSku: string;
  categoryName: string;
  barcode: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  unitOfMeasure: string;
  supplierName?: string;
  locationCode?: string;
  minAlertLevel?: number;
  /** עמודות נוספות מהאקסל — מאפייני קטגוריה / שדות מותאמים */
  extras?: Record<string, string>;
};

const UNIT_CODES = new Set(UNIT_OF_MEASURE.map((u) => u.code));
const UNIT_BY_LABEL = new Map(
  UNIT_OF_MEASURE.map((u) => [u.label.replace(/\s/g, ""), u.code])
);

const HEADER_ALIASES: Record<string, keyof ImportProductRow | "skip"> = {
  title: "title",
  name: "title",
  שם: "title",
  "שם מוצר": "title",
  basesku: "baseSku",
  "base sku": "baseSku",
  מקט: "baseSku",
  "מק״ט": "baseSku",
  "מק\"ט": "baseSku",
  categoryname: "categoryName",
  category: "categoryName",
  קטגוריה: "categoryName",
  barcode: "barcode",
  ברקוד: "barcode",
  sku: "sku",
  costprice: "costPrice",
  cost: "costPrice",
  עלות: "costPrice",
  "מחיר עלות": "costPrice",
  sellingprice: "sellingPrice",
  price: "sellingPrice",
  מכירה: "sellingPrice",
  "מחיר מכירה": "sellingPrice",
  qty: "qty",
  quantity: "qty",
  כמות: "qty",
  "מלאי התחלתי": "qty",
  unitofmeasure: "unitOfMeasure",
  unit: "unitOfMeasure",
  יחידה: "unitOfMeasure",
  "יחידת מידה": "unitOfMeasure",
  suppliername: "supplierName",
  supplier: "supplierName",
  ספק: "supplierName",
  locationcode: "locationCode",
  location: "locationCode",
  מיקום: "locationCode",
  מדף: "locationCode",
  minalertlevel: "minAlertLevel",
  minalert: "minAlertLevel",
  מינימום: "minAlertLevel",
  "מינימום התראה": "minAlertLevel",
};

export function normalizeHeader(h: string): string {
  return String(h || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function mapHeaders(
  headers: string[]
): (keyof ImportProductRow | null)[] {
  return headers.map((h) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (!key || key === "skip") return null;
    return key;
  });
}

export function normalizeUnit(raw: string): string {
  const v = String(raw || "UNIT").trim().toUpperCase();
  if (UNIT_CODES.has(v as never)) return v;
  const byLabel = UNIT_BY_LABEL.get(String(raw || "").replace(/\s/g, ""));
  if (byLabel) return byLabel;
  return "UNIT";
}

export function rowFromValues(
  headers: (keyof ImportProductRow | null)[],
  rawHeaders: string[],
  values: unknown[],
  rowIndex: number
): ImportProductRow | { error: string } {
  const get = (key: keyof ImportProductRow) => {
    const i = headers.indexOf(key);
    if (i < 0) return "";
    const v = values[i];
    if (v == null) return "";
    return String(v).trim();
  };

  const title = get("title");
  const baseSku = get("baseSku").toUpperCase();
  if (!title || !baseSku) {
    return { error: `שורה ${rowIndex}: חסר שם או מק״ט` };
  }

  const skuRaw = get("sku");
  const sku = (skuRaw || baseSku).toUpperCase();
  const barcode = get("barcode") || `${sku}-1`;

  const extras: Record<string, string> = {};
  headers.forEach((mapped, i) => {
    if (mapped) return;
    const name = String(rawHeaders[i] || "").trim();
    if (!name) return;
    const val = values[i] == null ? "" : String(values[i]).trim();
    if (val) extras[name] = val;
  });

  return {
    title,
    baseSku,
    categoryName: get("categoryName") || "כללי",
    barcode,
    sku,
    costPrice: Number(get("costPrice") || 0) || 0,
    sellingPrice: Number(get("sellingPrice") || 0) || 0,
    qty: Math.max(0, Number(get("qty") || 0) || 0),
    unitOfMeasure: normalizeUnit(get("unitOfMeasure")),
    supplierName: get("supplierName") || undefined,
    locationCode: get("locationCode") || undefined,
    minAlertLevel:
      get("minAlertLevel") !== ""
        ? Math.max(0, Number(get("minAlertLevel")) || 0)
        : undefined,
    extras: Object.keys(extras).length ? extras : undefined,
  };
}

function parseAttrSchema(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const o = item as { label?: string; key?: string };
          return String(o.label || o.key || "").trim();
        }
        return "";
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function importProductRows(
  companyId: string,
  userId: string | undefined,
  rows: ImportProductRow[],
  sourceLabel = "ייבוא"
): Promise<{ created: number; errors: string[]; categoriesCreated: number }> {
  let created = 0;
  let categoriesCreated = 0;
  const errors: string[] = [];

  const customFields = await prisma.customField.findMany({
    where: { companyId, entityType: "PRODUCT", active: true },
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2;
    try {
      let category = await prisma.category.findFirst({
        where: { companyId, name: row.categoryName },
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            companyId,
            name: row.categoryName,
            hasVariants: false,
            attributeSchema: "[]",
          },
        });
        categoriesCreated += 1;
      }

      let supplierId: string | null = null;
      if (row.supplierName) {
        let supplier = await prisma.supplier.findFirst({
          where: { companyId, name: row.supplierName },
        });
        if (!supplier) {
          supplier = await prisma.supplier.create({
            data: { companyId, name: row.supplierName },
          });
        }
        supplierId = supplier.id;
      }

      let locationId: string | null = null;
      if (row.locationCode) {
        const loc = await prisma.warehouseLocation.findFirst({
          where: { companyId, code: row.locationCode },
        });
        if (!loc) {
          errors.push(`שורה ${lineNo}: מיקום «${row.locationCode}» לא נמצא`);
        } else {
          locationId = loc.id;
        }
      }

      const schemaAttrs = parseAttrSchema(category.attributeSchema);
      const attributes: Record<string, string> = {};
      const customData: Record<string, string> = {};
      const newSchemaAttrs = [...schemaAttrs];

      const relevantFields = customFields.filter(
        (f) => !f.categoryId || f.categoryId === category!.id
      );

      for (const [col, val] of Object.entries(row.extras || {})) {
        const colNorm = col.trim();
        if (!colNorm || !val) continue;

        const field = relevantFields.find(
          (f) =>
            f.label === colNorm ||
            f.key === colNorm ||
            f.label.toLowerCase() === colNorm.toLowerCase() ||
            f.key.toLowerCase() === colNorm.toLowerCase()
        );
        if (field) {
          customData[field.key] = val;
          continue;
        }

        // עמודה לא ממופה = מאפיין וריאנט (מידה/צבע וכו׳) — מתעדכנת בסכמת הקטגוריה
        const attrName = colNorm
          .replace(/^מאפיין:\s*/i, "")
          .replace(/^attr:\s*/i, "")
          .trim();
        if (!attrName) continue;
        attributes[attrName] = val;
        if (
          !newSchemaAttrs.some(
            (a) => a.toLowerCase() === attrName.toLowerCase()
          )
        ) {
          const known = GLOBAL_CATEGORY_ATTRIBUTES.find(
            (a) => a.toLowerCase() === attrName.toLowerCase()
          );
          newSchemaAttrs.push(known || attrName);
        }
      }

      if (
        newSchemaAttrs.length !== schemaAttrs.length ||
        (Object.keys(attributes).length > 0 && !category.hasVariants)
      ) {
        category = await prisma.category.update({
          where: { id: category.id },
          data: {
            hasVariants:
              category.hasVariants || Object.keys(attributes).length > 0,
            attributeSchema: stringifyJson(newSchemaAttrs),
          },
        });
      }

      let product = await prisma.product.findFirst({
        where: { companyId, baseSku: row.baseSku },
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            companyId,
            title: row.title,
            baseSku: row.baseSku,
            categoryId: category.id,
            supplierId,
            costPrice: row.costPrice,
            sellingPrice: row.sellingPrice,
            unitOfMeasure: row.unitOfMeasure,
            customData: stringifyJson(customData),
          },
        });
      } else {
        const prevCustom = (() => {
          try {
            return JSON.parse(product!.customData || "{}") as Record<
              string,
              string
            >;
          } catch {
            return {};
          }
        })();
        await prisma.product.update({
          where: { id: product.id },
          data: {
            title: row.title,
            categoryId: category.id,
            ...(supplierId ? { supplierId } : {}),
            costPrice: row.costPrice,
            sellingPrice: row.sellingPrice,
            unitOfMeasure: row.unitOfMeasure,
            customData: stringifyJson({ ...prevCustom, ...customData }),
          },
        });
      }

      const existing = await prisma.productVariant.findFirst({
        where: {
          companyId,
          OR: [{ sku: row.sku }, { barcode: row.barcode }],
        },
      });
      if (existing) {
        errors.push(`שורה ${lineNo}: SKU/ברקוד כבר קיים (${row.sku})`);
        continue;
      }

      const variant = await prisma.productVariant.create({
        data: {
          companyId,
          productId: product.id,
          sku: row.sku,
          barcode: row.barcode,
          attributes: stringifyJson(attributes),
          quantityOnHand: row.qty,
          locationId,
          minAlertLevel: row.minAlertLevel ?? 5,
        },
      });

      if (row.qty > 0) {
        await prisma.stockTransaction.create({
          data: {
            variantId: variant.id,
            type: "INBOUND",
            quantityChanged: row.qty,
            previousQuantity: 0,
            newQuantity: row.qty,
            reason: `${sourceLabel} · מלאי התחלתי`,
            reasonCode: "IMPORT",
            userId: userId || null,
            toLocationId: locationId,
          },
        });
      }
      created += 1;
    } catch (e) {
      errors.push(
        `שורה ${lineNo}: ${e instanceof Error ? e.message : "שגיאה"}`
      );
    }
  }

  return { created, errors, categoriesCreated };
}

export const IMPORT_TEMPLATE_HEADERS_HE = [
  "שם",
  "מקט",
  "קטגוריה",
  "ברקוד",
  "SKU",
  "עלות",
  "מכירה",
  "כמות",
  "יחידה",
  "ספק",
  "מיקום",
  "מינימום התראה",
  "מידה",
  "צבע",
  "מותג",
] as const;

export const IMPORT_TEMPLATE_SAMPLE: (string | number)[][] = [
  [
    "חולצה כחולה",
    "SHIRT-001",
    "חולצות",
    "7290001234567",
    "SHIRT-001-M-BLU",
    40,
    89,
    10,
    "UNIT",
    "ספק דוגמה",
    "",
    5,
    "M",
    "כחול",
    "BrandX",
  ],
  [
    "חלב 3%",
    "MILK-1L",
    "מוצרי חלב",
    "7290007654321",
    "MILK-1L",
    4.5,
    7.9,
    24,
    "LITER",
    "",
    "",
    6,
    "",
    "",
    "טרה",
  ],
  [
    "פילטר שמן",
    "OIL-F-01",
    "פילטרים",
    "7290001112223",
    "OIL-F-01",
    25,
    59,
    5,
    "UNIT",
    "חלפים בע״מ",
    "",
    3,
    "",
    "",
    "",
  ],
];

export const SUGGESTED_CATEGORIES = [
  "כללי",
  "חולצות",
  "מכנסיים",
  "נעליים",
  "אקססוריז",
  "מוצרי חלב",
  "יבשים",
  "קפואים",
  "משקאות",
  "בלמים",
  "פילטרים",
  "חשמל",
  "שמנים ונוזלים",
  "חלקי שירות",
];
