import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const safe = (value) => (value === null || value === undefined ? "-" : String(value));

const normalizeCsvCell = (value) => {
  const text = safe(value).replace(/\r?\n|\r/g, " ").trim();
  if (/[",;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export function downloadCsv(filename, headers = [], rows = []) {
  const csvLines = [
    headers.map(normalizeCsvCell).join(","),
    ...rows.map((row) => (Array.isArray(row) ? row : []).map(normalizeCsvCell).join(",")),
  ];

  const blob = new Blob(["\ufeff" + csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || `gfms-export-${Date.now()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadPdfReport({ filename, title, subtitle, headers = [], rows = [] }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title || "GFMS Export", 40, 40);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, 40, 58);
  }

  autoTable(doc, {
    startY: subtitle ? 74 : 58,
    head: [headers.map((header) => safe(header))],
    body: rows.map((row) => (Array.isArray(row) ? row : []).map((cell) => safe(cell))),
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      lineColor: [230, 230, 230],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [32, 36, 48],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [247, 248, 250],
    },
    margin: { left: 28, right: 28 },
  });

  doc.save(filename || "gfms-export.pdf");
}
