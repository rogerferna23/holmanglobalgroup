// Generador de Excel sin dependencias externas.
// Genera un archivo .xls usando HTML+SpreadsheetML que Excel abre nativamente.
// Para .xlsx real necesitaria SheetJS (~400KB), no vale la pena para esto.

type Sheet = {
  name: string;
  columns: string[];
  rows: (string | number)[][];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetToHtml(sheet: Sheet): string {
  const head = sheet.columns
    .map((c) => `<th>${escapeHtml(c)}</th>`)
    .join("");
  const body = sheet.rows
    .map(
      (r) =>
        `<tr>${r
          .map((cell) => {
            const v = typeof cell === "number" ? cell : escapeHtml(String(cell));
            const align =
              typeof cell === "number" ? ' style="mso-number-format:\'0.00\'"' : "";
            return `<td${align}>${v}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");
  return `<table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function downloadExcel(filename: string, sheets: Sheet[]) {
  const tables = sheets
    .map(
      (s) => `<h3>${escapeHtml(s.name)}</h3>${sheetToHtml(s)}<br/><br/>`
    )
    .join("");
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8"/>
<style>
  table { border-collapse: collapse; }
  th, td { border: 1px solid #888; padding: 4px 8px; font-family: Arial, sans-serif; font-size: 11px; }
  th { background: #F0B800; color: #0B1016; font-weight: 700; text-align: left; }
  h3 { font-family: Arial, sans-serif; color: #0B1016; }
</style>
</head>
<body>${tables}</body>
</html>`;
  // BOM para que Excel detecte UTF-8 correctamente.
  const blob = new Blob(["﻿" + html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
