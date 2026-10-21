function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  // BOM for Excel Hebrew
  return "\uFEFF" + lines.join("\n");
}
