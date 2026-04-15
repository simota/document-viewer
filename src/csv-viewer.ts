import Papa from 'papaparse';

export function renderCsvTable(content: string, path: string): string {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (!result.data.length || !result.meta.fields?.length) {
    return `<p class="error-banner">No data found in ${path}</p>`;
  }

  const fields = result.meta.fields;
  const rows = result.data as Record<string, unknown>[];

  const ths = fields.map((f) => `<th data-col="${esc(f)}" role="columnheader" aria-sort="none">${esc(f)}<span class="sort-indicator" aria-hidden="true"></span></th>`).join('');
  const trs = rows.map((row, i) => {
    const tds = fields.map((f) => `<td>${esc(String(row[f] ?? ''))}</td>`).join('');
    return `<tr data-row-index="${i}">${tds}</tr>`;
  }).join('');

  return `<div class="csv-view">
    <div class="csv-info">${rows.length} rows &times; ${fields.length} columns</div>
    <div class="csv-table-wrap">
      <table class="csv-table csv-sortable">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
  </div>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const NUM_RE = /^-?[\d,]+\.?\d*$/;
const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0;
}

function detectColumnType(rows: Element[], colIndex: number): 'number' | 'date' | 'string' {
  let numCount = 0;
  let dateCount = 0;
  const sample = Math.min(rows.length, 20);
  for (let i = 0; i < sample; i++) {
    const text = (rows[i].children[colIndex]?.textContent ?? '').trim();
    if (!text) continue;
    if (NUM_RE.test(text)) numCount++;
    else if (DATE_RE.test(text) && !isNaN(Date.parse(text))) dateCount++;
  }
  if (numCount >= sample * 0.8) return 'number';
  if (dateCount >= sample * 0.8) return 'date';
  return 'string';
}

function updateSortHeaders(
  ths: Element[],
  activeTh: Element,
  direction: 'ascending' | 'descending',
): void {
  ths.forEach((h) => {
    h.setAttribute('aria-sort', 'none');
    h.classList.remove('sort-asc', 'sort-desc');
  });
  activeTh.setAttribute('aria-sort', direction);
  activeTh.classList.add(direction === 'ascending' ? 'sort-asc' : 'sort-desc');
}

function compareRows(
  a: Element,
  b: Element,
  colIndex: number,
  colType: 'number' | 'date' | 'string',
): number {
  const aText = (a.children[colIndex]?.textContent ?? '').trim();
  const bText = (b.children[colIndex]?.textContent ?? '').trim();
  if (colType === 'number') return parseNum(aText) - parseNum(bText);
  if (colType === 'date') return Date.parse(aText) - Date.parse(bText);
  return aText.localeCompare(bText);
}

export function initCsvSort(): void {
  document.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('.csv-sortable th');
    if (!th) return;

    const table = th.closest('table')!;
    const ths = Array.from(table.querySelectorAll('thead th'));
    const colIndex = ths.indexOf(th as HTMLTableCellElement);
    if (colIndex < 0) return;

    const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    updateSortHeaders(ths, th, direction);

    const tbody = table.querySelector('tbody')!;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const colType = detectColumnType(rows, colIndex);

    rows.sort((a, b) => {
      const cmp = compareRows(a, b, colIndex, colType);
      return direction === 'ascending' ? cmp : -cmp;
    });

    rows.forEach((row) => tbody.appendChild(row));
  });
}
