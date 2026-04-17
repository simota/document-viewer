/**
 * Apache / nginx access log viewer.
 *
 * Supported formats:
 *   Combined: %h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-agent}i"
 *   Common:   %h %l %u %t "%r" %>s %b
 */

const MAX_TABLE_ROWS = 1000;

// Combined log format regex (covers Apache Combined & nginx default)
const COMBINED_RE =
  /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*?)"\s+(\d{3}|-)\s+(\S+)\s+"([^"]*?)"\s+"([^"]*?)"\s*$/;

// Common log format regex (no Referer / User-Agent)
const COMMON_RE =
  /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*?)"\s+(\d{3}|-)\s+(\S+)\s*$/;

export interface LogEntry {
  ip: string;
  user: string;
  timestamp: string;
  method: string;
  path: string;
  protocol: string;
  status: string;
  size: string;
  referer: string;
  userAgent: string;
  raw: string;
}

export type LogFormat = 'combined' | 'common' | 'unknown';

function parseRequest(req: string): { method: string; path: string; protocol: string } {
  const parts = req.split(' ');
  return {
    method: parts[0] ?? '',
    path: parts[1] ?? req,
    protocol: parts[2] ?? '',
  };
}

export function detectLogFormat(content: string): LogFormat {
  const firstLines = content.split('\n').filter((l) => l.trim()).slice(0, 5);
  for (const line of firstLines) {
    if (COMBINED_RE.test(line)) return 'combined';
    if (COMMON_RE.test(line)) return 'common';
  }
  return 'unknown';
}

function parseLine(line: string, format: LogFormat): LogEntry | null {
  const raw = line;

  if (format === 'combined') {
    const m = COMBINED_RE.exec(line);
    if (!m) return null;
    const req = parseRequest(m[5]);
    return {
      ip: m[1], user: m[3], timestamp: m[4],
      method: req.method, path: req.path, protocol: req.protocol,
      status: m[6], size: m[7], referer: m[8], userAgent: m[9],
      raw,
    };
  }

  if (format === 'common') {
    const m = COMMON_RE.exec(line);
    if (!m) return null;
    const req = parseRequest(m[5]);
    return {
      ip: m[1], user: m[3], timestamp: m[4],
      method: req.method, path: req.path, protocol: req.protocol,
      status: m[6], size: m[7], referer: '-', userAgent: '-',
      raw,
    };
  }

  return null;
}

function statusClass(status: string): string {
  const code = parseInt(status, 10);
  if (code >= 200 && code < 300) return 'log-status-2xx';
  if (code >= 300 && code < 400) return 'log-status-3xx';
  if (code >= 400 && code < 500) return 'log-status-4xx';
  if (code >= 500) return 'log-status-5xx';
  return '';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderLogTable(content: string, _path: string): string {
  // Preserve the original file-line index alongside the content so URL #line=
  // references the real line, even when blank rows or unparsable rows sit in
  // between.
  const rawLines = content.split('\n');
  const indexed: Array<{ line: string; origLine: number }> = [];
  rawLines.forEach((l, i) => { if (l.trim() !== '') indexed.push({ line: l, origLine: i + 1 }); });

  if (!indexed.length) {
    return `<p class="error-banner">No log entries found.</p>`;
  }

  const format = detectLogFormat(content);

  if (format === 'unknown') {
    // Not a recognized access log — signal caller to fall back to plain text
    return '';
  }

  const allCount = indexed.length;
  const tableItems = indexed.slice(0, MAX_TABLE_ROWS);
  const truncated = allCount > MAX_TABLE_ROWS;

  const entries: LogEntry[] = [];
  const entryLineNums: number[] = [];
  const unparsed: number[] = [];

  tableItems.forEach(({ line, origLine }) => {
    const entry = parseLine(line, format);
    if (entry) {
      entries.push(entry);
      entryLineNums.push(origLine);
    } else {
      unparsed.push(origLine);
    }
  });

  if (!entries.length) {
    return `<p class="error-banner">Could not parse any log entries.</p>`;
  }

  const isCombined = format === 'combined';

  const headerCols = [
    'IP', 'User', 'Timestamp', 'Method', 'Path', 'Status', 'Size',
    ...(isCombined ? ['Referer', 'User-Agent'] : []),
  ];

  const ths = [
    `<th class="log-line-num-head" aria-label="Line number">#</th>`,
    ...headerCols.map((h) => `<th data-col="${esc(h)}" role="columnheader" aria-sort="none">${esc(h)}<span class="sort-indicator" aria-hidden="true"></span></th>`),
  ].join('');

  const trs = entries
    .map((e, i) => {
      const sc = statusClass(e.status);
      const lineNum = entryLineNums[i];
      const lineTd = `<td class="log-line-num" data-line="${lineNum}" role="button" tabindex="0" title="Click to copy link to line ${lineNum}">${lineNum}</td>`;
      const baseTds = [
        `<td>${esc(e.ip)}</td>`,
        `<td>${esc(e.user)}</td>`,
        `<td class="log-ts">${esc(e.timestamp)}</td>`,
        `<td><span class="log-method log-method-${esc(e.method.toLowerCase())}">${esc(e.method)}</span></td>`,
        `<td class="log-path" title="${esc(e.path)}">${esc(e.path)}</td>`,
        `<td><span class="log-status ${sc}">${esc(e.status)}</span></td>`,
        `<td class="log-num">${esc(e.size)}</td>`,
      ];
      const extraTds = isCombined
        ? [
            `<td class="log-referer" title="${esc(e.referer)}">${esc(e.referer)}</td>`,
            `<td class="log-ua" title="${esc(e.userAgent)}">${esc(e.userAgent)}</td>`,
          ]
        : [];
      return `<tr data-row-index="${i}" data-line="${lineNum}">${[lineTd, ...baseTds, ...extraTds].join('')}</tr>`;
    })
    .join('');

  const totalLabel = truncated
    ? `Showing first ${entries.length} of ${allCount} lines`
    : `${entries.length} entries`;

  const warnBanner =
    unparsed.length > 0
      ? `<div class="csv-info csv-info--warn">Skipped ${unparsed.length} unparsed line(s): ${unparsed.slice(0, 10).join(', ')}${unparsed.length > 10 ? '…' : ''}</div>`
      : '';

  const truncBanner = truncated
    ? `<div class="csv-info csv-info--warn">Table limited to first ${MAX_TABLE_ROWS} rows. Use Source view to see all ${allCount} lines.</div>`
    : '';

  return `<div class="csv-view log-view">
    <div class="csv-info">${esc(totalLabel)} &bull; Format: ${esc(format)}</div>
    ${warnBanner}${truncBanner}
    <div class="csv-table-wrap">
      <table class="csv-table csv-sortable">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
  </div>`;
}
