// src/utils/leaveApplicationsPdf.ts
//
// "PDF" on HR › Leave Application — the app's version of the web's
// Leave_Applications.pdf.
//
// The web makes no request for it (HAR 2026-10-15, 20:39): jsPDF's autoTable
// prints the table currently on screen — the loaded page of rows — on a US
// Letter portrait page under the caption "Leave Applications", with a red
// (232, 0, 43) header row, white header text and striped rows. Same here,
// minus the web's "Action" column, which in its file is just the button
// labels "Approve Reject Delete" printed on every row.

import { generatePDF } from 'react-native-html-to-pdf';
import { scaleCssPx } from './printScale';
import { openPdf } from './openPdf';

const esc = (v: any) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "2026-10-10" → "10-10-2026", read off the string so no timezone shift. */
const dmy = (v: any) => {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : 'N/A';
};

const COLS = ['Sr#', 'Name', 'Leave Status', 'Leave Type', 'Category', 'From', 'To', 'No. Of Leaves', 'Application Status'];

export const buildLeaveApplicationsHtml = (rows: any[], offset = 0) => `<!doctype html>
<html><head><meta charset="utf-8" />
<style>${scaleCssPx(`
  body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 28px 30px; color: #333; }
  h1 { font-size: 20px; font-weight: 400; color: #000; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 8px; }
  th { background: rgb(232, 0, 43); color: #fff; font-weight: 700; text-align: left; padding: 6px 5px; }
  td { padding: 6px 5px; color: #555; }
  tr:nth-child(even) td { background: #F5F5F5; }
  .empty { text-align: center; padding: 14px; }
`)}</style></head>
<body>
  <h1>Leave Applications</h1>
  <table>
    <thead><tr>${COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map((r, i) => `<tr>
      <td>${offset + i + 1}</td>
      <td>${esc(r.user_info?.name ?? 'N/A')}</td>
      <td>${esc(r.leave_status)}</td>
      <td>${esc(r.leave_type || 'N/A')}</td>
      <td>${esc(r.category || 'N/A')}</td>
      <td>${dmy(r.from)}</td>
      <td>${dmy(r.to)}</td>
      <td>${esc(r.number_of_leaves)}</td>
      <td>${esc(r.application_status)}</td>
    </tr>`).join('') : `<tr><td class="empty" colspan="${COLS.length}">No record found</td></tr>`}</tbody>
  </table>
</body></html>`;

/** Build the PDF from the rows on screen and hand it to the user (see openPdf). */
export const downloadLeaveApplicationsPdf = async (rows: any[], offset: number, navigation: any) => {
  const fileName = 'Leave_Applications';
  const { filePath } = await generatePDF({
    html: buildLeaveApplicationsHtml(rows, offset),
    fileName,
    width: 612,   // US Letter in points, as the web's jsPDF("p", "mm", "letter")
    height: 792,
    padding: 0,
    shouldPrintBackgrounds: true,
  });
  await openPdf(filePath, fileName, 'Leave Applications', navigation);
};
