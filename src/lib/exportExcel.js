import * as XLSX from "xlsx";
import { flattenLeads } from "./answers";
import { displayDate } from "./dates";
export function exportExcel(leads, period, range) {
  const { headers, rows } = flattenLeads(leads);
  rows.forEach((row) => {
    row[5] = displayDate(row[5]);
  });
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((_, i) => ({ wch: i >= 6 ? 36 : 24 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
  XLSX.writeFile(workbook, `leads-${period}-${range.start}.xlsx`);
}
