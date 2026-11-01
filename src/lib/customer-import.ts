import { prisma } from "@/lib/db";
import { normalizeHeader } from "@/lib/csv-parse";

export type ImportCustomerRow = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  creditLimit?: number | null;
  notes?: string | null;
};

const HEADER_MAP: Record<string, keyof ImportCustomerRow> = {
  name: "name",
  שם: "name",
  customer: "name",
  לקוח: "name",
  phone: "phone",
  טלפון: "phone",
  email: "email",
  אימייל: "email",
  address: "address",
  כתובת: "address",
  taxid: "taxId",
  חפ: "taxId",
  "ע.מ": "taxId",
  creditlimit: "creditLimit",
  אשראי: "creditLimit",
  תקרתאשראי: "creditLimit",
  notes: "notes",
  הערות: "notes",
};

export function mapCustomerHeaders(raw: string[]) {
  return raw.map((h) => HEADER_MAP[normalizeHeader(h)] || null);
}

export function customerRowFromValues(
  headers: (keyof ImportCustomerRow | null)[],
  values: unknown[],
  rowNum: number
): ImportCustomerRow | { error: string } {
  const get = (key: keyof ImportCustomerRow) => {
    const idx = headers.indexOf(key);
    if (idx < 0) return "";
    return String(values[idx] ?? "").trim();
  };
  const name = get("name");
  if (!name) return { error: `שורה ${rowNum}: חסר שם לקוח` };
  const creditRaw = get("creditLimit");
  const creditLimit =
    creditRaw === ""
      ? null
      : Number(creditRaw.replace(/,/g, ""));
  return {
    name,
    phone: get("phone") || null,
    email: get("email") || null,
    address: get("address") || null,
    taxId: get("taxId") || null,
    creditLimit:
      creditLimit != null && Number.isFinite(creditLimit) ? creditLimit : null,
    notes: get("notes") || null,
  };
}

export async function importCustomerRows(
  companyId: string,
  rows: ImportCustomerRow[]
) {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await prisma.customer.findFirst({
        where: {
          companyId,
          OR: [
            ...(row.phone ? [{ phone: row.phone }] : []),
            ...(row.email ? [{ email: row.email }] : []),
            { name: row.name },
          ],
        },
      });
      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            phone: row.phone ?? existing.phone,
            email: row.email ?? existing.email,
            address: row.address ?? existing.address,
            taxId: row.taxId ?? existing.taxId,
            creditLimit:
              row.creditLimit != null ? row.creditLimit : existing.creditLimit,
            notes: row.notes ?? existing.notes,
          },
        });
        updated++;
      } else {
        await prisma.customer.create({
          data: {
            companyId,
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            taxId: row.taxId,
            creditLimit: row.creditLimit,
            notes: row.notes,
          },
        });
        created++;
      }
    } catch (e) {
      errors.push(
        `${row.name}: ${e instanceof Error ? e.message : "שגיאה"}`
      );
    }
  }

  return { created, updated, errors };
}
