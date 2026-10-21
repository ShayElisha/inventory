export function slugCode(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9א-ת]/g, "")
    .slice(0, 6)
    .toUpperCase() || "X";
}

export function buildVariantSku(
  baseSku: string,
  attributes: Record<string, string>,
  schema: string[]
): string {
  const parts = schema
    .map((key) => attributes[key])
    .filter(Boolean)
    .map(slugCode);
  return parts.length ? `${baseSku}-${parts.join("-")}` : baseSku;
}

/** Cartesian product of attribute option arrays */
export function generateMatrixCombinations(
  schema: string[],
  optionsByAttr: Record<string, string[]>
): Record<string, string>[] {
  const keys = schema.filter((k) => (optionsByAttr[k] || []).length > 0);
  if (keys.length === 0) return [{}];

  return keys.reduce<Record<string, string>[]>(
    (acc, key) => {
      const values = optionsByAttr[key].map((v) => v.trim()).filter(Boolean);
      if (values.length === 0) return acc;
      return acc.flatMap((combo) =>
        values.map((value) => ({ ...combo, [key]: value }))
      );
    },
    [{}]
  );
}
