import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export data to Excel (.xlsx)
 */
export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName = 'Sheet1'
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export multiple sheets to Excel
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, any>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    const colWidths = Object.keys(sheet.data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...sheet.data.map(row => String(row[key] ?? '').length)) + 2,
    }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}.csv`);
}

/**
 * Print-friendly PDF export via browser print dialog
 */
export function exportToPrintPDF(title: string, content: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .total-row { background: #e8e8e8 !important; font-weight: 700; }
        .section { margin-top: 20px; }
        .meta { font-size: 11px; color: #888; margin-bottom: 20px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      ${content}
      <div class="meta">Generated on ${new Date().toLocaleString()}</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

/**
 * Format currency (GHS)
 */
export function formatCurrency(amount: number): string {
  return `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate HTML table from data for PDF export
 */
export function dataToHtmlTable(
  data: Record<string, any>[],
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; format?: (v: any) => string }[]
): string {
  const header = columns.map(c => `<th class="${c.align === 'right' ? 'text-right' : ''}">${c.label}</th>`).join('');
  const rows = data.map(row =>
    '<tr>' + columns.map(c => {
      const val = c.format ? c.format(row[c.key]) : row[c.key] ?? '';
      return `<td class="${c.align === 'right' ? 'text-right' : ''}">${val}</td>`;
    }).join('') + '</tr>'
  ).join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}
