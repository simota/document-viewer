import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import mermaid from 'mermaid';

let mermaidCounter = 0;

function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: '"Inter", "Noto Sans JP", sans-serif',
  });
}

initMermaid(false);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang === 'mermaid') {
      const id = `mermaid-${mermaidCounter++}`;
      return `<div class="mermaid-container"><pre class="mermaid" id="${id}">${md.utils.escapeHtml(str)}</pre></div>`;
    }
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {
        // fallthrough
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

// Add target="_blank" to external links
const defaultRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const href = tokens[idx].attrGet('href');
  if (href && /^https?:\/\//.test(href)) {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
  }
  return defaultRender(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  mermaidCounter = 0;
  return md.render(source);
}

export async function renderMermaidDiagrams(): Promise<void> {
  const elements = document.querySelectorAll<HTMLElement>('pre.mermaid');
  for (const el of elements) {
    if (el.dataset.processed === 'true') continue;
    const code = el.textContent || '';
    const id = el.id || `mermaid-${Date.now()}`;
    try {
      const { svg } = await mermaid.render(id + '-svg', code);
      const wrapper = el.closest('.mermaid-container');
      if (wrapper) {
        wrapper.innerHTML = `<div class="mermaid-rendered">${svg}</div>`;
      }
    } catch {
      el.classList.add('mermaid-error');
      el.dataset.processed = 'true';
    }
  }
}

export function updateMermaidTheme(isDark: boolean): void {
  initMermaid(isDark);
}
