/**
 * Chunked table viewer with server-side pagination.
 * Handles large CSV, TSV, JSONL, and Log files without loading them fully into memory.
 */

import Papa from 'papaparse';
import { detectLogFormat, type LogEntry, type LogFormat } from './log-viewer';

type FileKind = 'csv' | 'jsonl' | 'log';

interface ChunkMeta {
  path: string;
  kind: FileKind;
  totalLines: number;
  fileSize: number;
  mtime: string;
}

const PAGE_SIZE = 1000;

// --- Shared HTML helpers ---

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function statusClass(status: string): string {
  const code = parseInt(status, 10);
  if (code >= 200 && code < 300) return 'log-status-2xx';
  if (code >= 300 && code < 400) return 'log-status-3xx';
  if (code >= 400 && code < 500) return 'log-status-4xx';
  if (code >= 500) return 'log-status-5xx';
  return '';
}

// --- CSV/TSV chunk parsing ---

interface CsvChunkResult {
  fields: string[];
  rows: Record<string, unknown>[];
}

function parseCsvChunk(text: string, hasHeader: boolean): CsvChunkResult {
  const result = Papa.parse(text, {
    header: hasHeader,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const fields = result.meta.fields ?? [];
  const rows = (result.data as Record<string, unknown>[]) ?? [];
  return { fields, rows };
}

// --- JSONL chunk parsing ---

interface JsonlChunkResult {
  fields: string[];
  rows: Record<string, unknown>[];
  parseErrors: number;
}

function parseJsonlChunk(text: string): JsonlChunkResult {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const rows: Record<string, unknown>[] = [];
  let parseErrors = 0;
  const fieldSet = new Map<string, true>();

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
        rows.push(obj as Record<string, unknown>);
        for (const key of Object.keys(obj)) fieldSet.set(key, true);
      } else {
        parseErrors++;
      }
    } catch {
      parseErrors++;
    }
  }

  return { fields: Array.from(fieldSet.keys()), rows, parseErrors };
}

// --- Log chunk parsing ---

const COMBINED_RE =
  /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*?)"\s+(\d{3}|-)\s+(\S+)\s+"([^"]*?)"\s+"([^"]*?)"\s*$/;
const COMMON_RE =
  /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*?)"\s+(\d{3}|-)\s+(\S+)\s*$/;

function parseLogLine(line: string, format: LogFormat): LogEntry | null {
  if (format === 'combined') {
    const m = COMBINED_RE.exec(line);
    if (!m) return null;
    const parts = m[5].split(' ');
    return {
      ip: m[1], user: m[3], timestamp: m[4],
      method: parts[0] ?? '', path: parts[1] ?? m[5], protocol: parts[2] ?? '',
      status: m[6], size: m[7], referer: m[8], userAgent: m[9], raw: line,
    };
  }
  if (format === 'common') {
    const m = COMMON_RE.exec(line);
    if (!m) return null;
    const parts = m[5].split(' ');
    return {
      ip: m[1], user: m[3], timestamp: m[4],
      method: parts[0] ?? '', path: parts[1] ?? m[5], protocol: parts[2] ?? '',
      status: m[6], size: m[7], referer: '-', userAgent: '-', raw: line,
    };
  }
  return null;
}

// --- Render helpers ---

function renderCsvRows(fields: string[], rows: Record<string, unknown>[]): string {
  return rows.map((row, i) => {
    const tds = fields.map((f) => `<td>${esc(String(row[f] ?? ''))}</td>`).join('');
    return `<tr data-row-index="${i}">${tds}</tr>`;
  }).join('');
}

function renderJsonlRows(fields: string[], rows: Record<string, unknown>[]): string {
  return rows.map((row, i) => {
    const tds = fields.map((f) => {
      const val = row[f];
      const cell = val === undefined || val === null ? ''
        : typeof val === 'object' ? esc(JSON.stringify(val))
        : esc(String(val));
      return `<td>${cell}</td>`;
    }).join('');
    return `<tr data-row-index="${i}">${tds}</tr>`;
  }).join('');
}

function renderLogRows(entries: LogEntry[], isCombined: boolean): string {
  return entries.map((e, i) => {
    const sc = statusClass(e.status);
    const tds = [
      `<td>${esc(e.ip)}</td>`,
      `<td>${esc(e.user)}</td>`,
      `<td class="log-ts">${esc(e.timestamp)}</td>`,
      `<td><span class="log-method log-method-${esc(e.method.toLowerCase())}">${esc(e.method)}</span></td>`,
      `<td class="log-path" title="${esc(e.path)}">${esc(e.path)}</td>`,
      `<td><span class="log-status ${sc}">${esc(e.status)}</span></td>`,
      `<td class="log-num">${esc(e.size)}</td>`,
    ];
    if (isCombined) {
      tds.push(
        `<td class="log-referer" title="${esc(e.referer)}">${esc(e.referer)}</td>`,
        `<td class="log-ua" title="${esc(e.userAgent)}">${esc(e.userAgent)}</td>`,
      );
    }
    return `<tr data-row-index="${i}">${tds.join('')}</tr>`;
  }).join('');
}

function renderPagination(currentPage: number, totalPages: number): string {
  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
  return `<div class="chunk-pagination">
    <button class="chunk-page-btn" data-page="first" ${prevDisabled} title="First page">&laquo;</button>
    <button class="chunk-page-btn" data-page="prev" ${prevDisabled} title="Previous page">&lsaquo;</button>
    <span class="chunk-page-info">
      <input class="chunk-page-input" type="number" min="1" max="${totalPages}" value="${currentPage}" aria-label="Page number"> / ${totalPages.toLocaleString()}
    </span>
    <button class="chunk-page-btn" data-page="next" ${nextDisabled} title="Next page">&rsaquo;</button>
    <button class="chunk-page-btn" data-page="last" ${nextDisabled} title="Last page">&raquo;</button>
  </div>`;
}

// --- Main chunked table class ---

export class ChunkedTable {
  private container: HTMLElement;
  private meta: ChunkMeta;
  private currentPage = 1;
  private totalPages: number;

  // Cached header for CSV (first row parsed from first chunk)
  private csvFields: string[] | null = null;
  // Cached log format
  private logFormat: LogFormat = 'unknown';

  constructor(container: HTMLElement, meta: ChunkMeta) {
    this.container = container;
    this.meta = meta;
    // For CSV, subtract header row from data lines
    const dataLines = meta.kind === 'csv' ? Math.max(0, meta.totalLines - 1) : meta.totalLines;
    this.totalPages = Math.max(1, Math.ceil(dataLines / PAGE_SIZE));
  }

  async init(): Promise<void> {
    // For CSV: fetch header row (line 0) separately to detect fields
    if (this.meta.kind === 'csv') {
      const headerText = await this.fetchLines(0, 1);
      const parsed = parseCsvChunk(headerText, true);
      this.csvFields = parsed.fields.length > 0 ? parsed.fields : null;
    }

    // For Log: detect format from first 5 lines
    if (this.meta.kind === 'log') {
      const sampleText = await this.fetchLines(0, 5);
      this.logFormat = detectLogFormat(sampleText);
      if (this.logFormat === 'unknown') {
        this.container.innerHTML = '';
        return; // signal caller to fall back
      }
    }

    await this.loadPage(1);
    this.bindEvents();
  }

  isLogUnknown(): boolean {
    return this.meta.kind === 'log' && this.logFormat === 'unknown';
  }

  private async fetchLines(offset: number, limit: number): Promise<string> {
    const url = `/api/file?path=${encodeURIComponent(this.meta.path)}&offset=${offset}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    // Update total if server provides it
    const totalHeader = res.headers.get('X-Total-Lines');
    if (totalHeader) {
      const total = parseInt(totalHeader, 10);
      if (!isNaN(total) && total > 0) {
        const dataLines = this.meta.kind === 'csv' ? Math.max(0, total - 1) : total;
        this.totalPages = Math.max(1, Math.ceil(dataLines / PAGE_SIZE));
        this.meta.totalLines = total;
      }
    }
    return res.text();
  }

  private async loadPage(page: number): Promise<void> {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));

    // Calculate line offset (CSV skips header row at line 0)
    const dataOffset = (this.currentPage - 1) * PAGE_SIZE;
    const lineOffset = this.meta.kind === 'csv' ? dataOffset + 1 : dataOffset;

    // Show loading state in tbody
    const tbody = this.container.querySelector('.chunk-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" class="chunk-loading">Loading...</td></tr>`;
    }

    const text = await this.fetchLines(lineOffset, PAGE_SIZE);
    this.renderTable(text);
  }

  private renderTable(chunkText: string): void {
    const { kind } = this.meta;
    let theadHtml: string;
    let tbodyHtml: string;
    let infoHtml: string;

    if (kind === 'csv') {
      const fields = this.csvFields ?? [];
      if (!fields.length) {
        // Fall back: parse chunk with header
        const parsed = parseCsvChunk(chunkText, true);
        this.csvFields = parsed.fields;
        theadHtml = this.buildThead(parsed.fields);
        tbodyHtml = renderCsvRows(parsed.fields, parsed.rows);
      } else {
        // Chunk has no header; use known fields
        const parsed = parseCsvChunk(fields.join(',') + '\n' + chunkText, true);
        theadHtml = this.buildThead(fields);
        tbodyHtml = renderCsvRows(fields, parsed.rows);
      }
      const ext = this.meta.path.split('.').pop()?.toUpperCase() || 'CSV';
      infoHtml = `${(this.meta.totalLines - 1).toLocaleString()} rows &mdash; ${ext} (chunked)`;
    } else if (kind === 'jsonl') {
      const parsed = parseJsonlChunk(chunkText);
      theadHtml = this.buildThead(parsed.fields);
      tbodyHtml = renderJsonlRows(parsed.fields, parsed.rows);
      infoHtml = `${this.meta.totalLines.toLocaleString()} lines &mdash; JSONL (chunked)`;
    } else {
      // log
      const isCombined = this.logFormat === 'combined';
      const headerCols = ['IP', 'User', 'Timestamp', 'Method', 'Path', 'Status', 'Size',
        ...(isCombined ? ['Referer', 'User-Agent'] : [])];
      theadHtml = this.buildThead(headerCols);

      const lines = chunkText.split('\n').filter((l) => l.trim() !== '');
      const entries: LogEntry[] = [];
      for (const line of lines) {
        const entry = parseLogLine(line, this.logFormat);
        if (entry) entries.push(entry);
      }
      tbodyHtml = renderLogRows(entries, isCombined);
      infoHtml = `${this.meta.totalLines.toLocaleString()} lines &bull; Format: ${esc(this.logFormat)} (chunked)`;
    }

    const startRow = (this.currentPage - 1) * PAGE_SIZE + 1;
    const endRow = Math.min(this.currentPage * PAGE_SIZE, kind === 'csv' ? this.meta.totalLines - 1 : this.meta.totalLines);
    const rangeInfo = `Rows ${startRow.toLocaleString()}&ndash;${endRow.toLocaleString()}`;

    const sizeKB = (this.meta.fileSize / 1024).toFixed(0);
    const sizeMB = (this.meta.fileSize / (1024 * 1024)).toFixed(1);
    const sizeLabel = this.meta.fileSize >= 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    const pagination = renderPagination(this.currentPage, this.totalPages);

    this.container.innerHTML = `<div class="csv-view${kind === 'log' ? ' log-view' : ''}">
      <div class="csv-info">${infoHtml} &bull; ${sizeLabel} &bull; ${rangeInfo}</div>
      ${pagination}
      <div class="csv-table-wrap">
        <table class="csv-table">
          <thead><tr>${theadHtml}</tr></thead>
          <tbody class="chunk-tbody">${tbodyHtml}</tbody>
        </table>
      </div>
      ${pagination}
    </div>`;

    this.bindEvents();
  }

  private buildThead(cols: string[]): string {
    return cols.map((f) => `<th>${esc(f)}</th>`).join('');
  }

  private bindEvents(): void {
    this.container.querySelectorAll<HTMLButtonElement>('.chunk-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.page;
        if (action === 'first') this.loadPage(1);
        else if (action === 'prev') this.loadPage(this.currentPage - 1);
        else if (action === 'next') this.loadPage(this.currentPage + 1);
        else if (action === 'last') this.loadPage(this.totalPages);
      });
    });

    this.container.querySelectorAll<HTMLInputElement>('.chunk-page-input').forEach((input) => {
      const onSubmit = () => {
        const val = parseInt(input.value, 10);
        if (!isNaN(val) && val >= 1 && val <= this.totalPages) {
          this.loadPage(val);
        } else {
          input.value = String(this.currentPage);
        }
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
      });
      input.addEventListener('change', onSubmit);
    });
  }
}
