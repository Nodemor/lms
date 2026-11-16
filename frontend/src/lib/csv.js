import api from '../api/client';

/**
 * Builds a CSV that Excel opens correctly with Sinhala and Tamil text (UTF-8 BOM) and downloads it.
 * columns: [{ label, value: (row) => any }]
 */
export function downloadCsv(fileName, columns, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(c.value(r))).join(',')));
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Loads every page of a paged API list (100 per request) for exporting. */
export async function fetchAllPages(path, params = {}) {
  const all = [];
  let page = 0;
  for (;;) {
    const { data } = await api.get(path, { params: { ...params, page, size: 100 } });
    all.push(...data.items);
    page += 1;
    if (page >= data.totalPages || page > 200) break;
  }
  return all;
}

export const today = () => new Date().toISOString().slice(0, 10);
