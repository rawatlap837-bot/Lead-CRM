import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { flattenLeads } from "./answers";
import { displayDate, TIMEZONE } from "./dates";
export function exportPdf(leads, period, range) {
  const { headers, rows } = flattenLeads(leads);
  rows.forEach((row) => {
    row[5] = displayDate(row[5]);
  });
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(18);
  doc.text("Creative crew · Lead report", 14, 17);
  doc.setFontSize(10);
  doc.text(`${range.label} | ${TIMEZONE} | ${leads.length} leads`, 14, 25);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 32,
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: 0,
    styles: { fontSize: 8, cellWidth: 30, overflow: "linebreak" },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { top: 14, right: 14, bottom: 14, left: 14 },
  });
  doc.save(`leads-${period}-${range.start}.pdf`);
}
