export const DOCUMENT_TYPES = [
  { code: "INVOICE", label: "חשבונית" },
  { code: "DELIVERY_NOTE", label: "תעודת משלוח" },
  { code: "CREDIT_NOTE", label: "זיכוי" },
  { code: "RMA", label: "החזרה" },
] as const;

export function documentTypeLabel(type: string) {
  return DOCUMENT_TYPES.find((t) => t.code === type)?.label || type;
}

export type DocumentPayloadLine = {
  sku?: string;
  title?: string;
  qty?: number;
  unitPrice?: number;
};

export type DocumentPayload = {
  customerName?: string;
  lines?: DocumentPayloadLine[];
  discountPercent?: number;
  notes?: string;
};

export function parseDocumentPayload(raw: string | null | undefined): DocumentPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as DocumentPayload;
  } catch {
    return {};
  }
}
