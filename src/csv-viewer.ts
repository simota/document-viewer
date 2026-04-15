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

export function initCsvSort(): void {
  document.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('.csv-sortable th');
    if (!th) return;

    const table = th.closest('table')!;
    const thead = table.querySelector('thead')!;
    const tbody = table.querySelector('tbody')!;
    const ths = Array.from(thead.querySelectorAll('th'));
    const colIndex = ths.indexOf(th as HTMLTableCellElement);
    if (colIndex < 0) return;

    // Determine sort direction
    const currentSort = th.getAttribute('aria-sort');
    const direction = currentSort === 'ascending' ? 'descending' : 'ascending';

    // Reset all headers
    ths.forEach((h) => {
      h.setAttribute('aria-sort', 'none');
      h.classList.remove('sort-asc', 'sort-desc');
    });

    // Set active header
    th.setAttribute('aria-sort', direction);
    th.classList.add(direction === 'ascending' ? 'sort-asc' : 'sort-desc');

    // Sort rows
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const aText = a.children[colIndex]?.textContent ?? '';
      const bText = b.children[colIndex]?.textContent ?? '';

      // Try numeric comparison first
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'ascending' ? aNum - bNum : bNum - aNum;
      }

      // Date comparison
      const aDate = Date.parse(aText);
      const bDate = Date.parse(bText);
      if (!isNaN(aDate) && !isNaN(bDate)) {
        return direction === 'ascending' ? aDate - bDate : bDate - aDate;
      }

      // String comparison
      const cmp = aText.localeCompare(bText);
      return direction === 'ascending' ? cmp : -cmp;
    });

    // Re-append sorted rows
    rows.forEach((row) => tbody.appendChild(row));
  });
}
