import ExcelJS from "exceljs";

export async function workbookToBuffer(workbook: ExcelJS.Workbook) {
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
  row.alignment = { vertical: "middle", horizontal: "right" };
}

export async function createSheetWorkbook(
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Inventory System";
  const sheet = wb.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });
  sheet.addRow(headers);
  styleHeader(sheet.getRow(1));
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((col) => {
    col.width = 16;
  });
  return wb;
}
