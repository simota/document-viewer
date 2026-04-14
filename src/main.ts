import Split from 'split.js';
import { renderMarkdown, renderMermaidDiagrams, updateMermaidTheme } from './markdown';
import { initTheme, toggleTheme } from './theme';
import { SAMPLE_MARKDOWN } from './sample';
import { FileTree } from './filetree';
import './style.css';

type LayoutMode = 'split' | 'editor' | 'preview';

let layoutMode: LayoutMode = 'preview';
let splitInstance: Split.Instance | null = null;
let renderTimeout: ReturnType<typeof setTimeout> | null = null;
let currentFilePath: string | null = null;
let sidebarVisible = false;

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const preview = document.getElementById('preview') as HTMLDivElement;
const charCount = document.getElementById('char-count') as HTMLSpanElement;
const btnTheme = document.getElementById('btn-theme') as HTMLButtonElement;
const btnOpen = document.getElementById('btn-open') as HTMLButtonElement;
const btnLayout = document.getElementById('btn-layout') as HTMLButtonElement;
const btnSidebar = document.getElementById('btn-sidebar') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const editorPane = document.getElementById('editor-pane') as HTMLDivElement;
const previewPane = document.getElementById('preview-pane') as HTMLDivElement;
const sidebar = document.getElementById('sidebar') as HTMLElement;

function updatePreview() {
  const source = editor.value;
  preview.innerHTML = renderMarkdown(source);
  charCount.textContent = `${source.length} chars`;
  renderMermaidDiagrams();
}

function debouncedUpdate() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(updatePreview, 150);
}

function initSplit() {
  if (splitInstance) {
    splitInstance.destroy();
    splitInstance = null;
  }
  editorPane.style.display = '';
  previewPane.style.display = '';
  editorPane.style.width = '';
  previewPane.style.width = '';

  document.body.dataset.layout = layoutMode;

  if (layoutMode === 'split') {
    splitInstance = Split(['#editor-pane', '#preview-pane'], {
      sizes: [50, 50],
      minSize: 200,
      gutterSize: 6,
      cursor: 'col-resize',
    });
  } else if (layoutMode === 'editor') {
    previewPane.style.display = 'none';
    editorPane.style.width = '100%';
  } else {
    editorPane.style.display = 'none';
    previewPane.style.width = '100%';
  }
}

function cycleLayout() {
  const modes: LayoutMode[] = ['split', 'editor', 'preview'];
  const idx = modes.indexOf(layoutMode);
  layoutMode = modes[(idx + 1) % modes.length];
  initSplit();
  if (layoutMode !== 'editor') {
    updatePreview();
  }
}

function openFile() {
  fileInput.click();
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.value = reader.result as string;
    currentFilePath = null;
    updatePreview();
  };
  reader.readAsText(file);
  input.value = '';
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  document.body.classList.remove('dragging');
  const file = e.dataTransfer?.files[0];
  if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt'))) {
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = reader.result as string;
      currentFilePath = null;
      updatePreview();
    };
    reader.readAsText(file);
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  document.body.classList.add('dragging');
}

function handleDragLeave() {
  document.body.classList.remove('dragging');
}

function handleKeyboard(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
    e.preventDefault();
    openFile();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault();
    toggleSidebar();
  }
}

// --- Sidebar / Server Mode ---

function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  sidebar.classList.toggle('sidebar-hidden', !sidebarVisible);
  btnSidebar.classList.toggle('toolbar-btn-active', sidebarVisible);
}

async function loadServerFile(path: string) {
  try {
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const content = await res.text();
    editor.value = content;
    currentFilePath = path;
    updatePreview();
    document.title = `${path} — Markdown Viewer`;
  } catch {
    // ignore
  }
}

async function reloadCurrentFile() {
  if (currentFilePath) {
    await loadServerFile(currentFilePath);
  }
}

function connectSSE() {
  const evtSource = new EventSource('/api/watch');

  evtSource.onmessage = (event) => {
    if (event.data === 'connected') return;

    try {
      const data = JSON.parse(event.data) as { event: string; path: string };

      if (data.event === 'change' && data.path === currentFilePath) {
        reloadCurrentFile();
      }

      if (data.event === 'add' || data.event === 'unlink') {
        fileTree?.refresh();
      }
    } catch {
      // ignore
    }
  };

  evtSource.onerror = () => {
    evtSource.close();
    // Reconnect after 3s
    setTimeout(connectSSE, 3000);
  };
}

async function detectServerMode(): Promise<{ server: boolean; initialFile: string | null }> {
  try {
    const res = await fetch('/api/info');
    if (res.ok) {
      const data = await res.json();
      return { server: true, initialFile: data.initialFile || null };
    }
  } catch {
    // not server mode
  }
  return { server: false, initialFile: null };
}

// --- Init ---

let fileTree: FileTree | null = null;

async function init() {
  const currentTheme = initTheme();
  updateMermaidTheme(currentTheme === 'dark');

  const { server: hasServer, initialFile } = await detectServerMode();

  if (hasServer) {
    fileTree = new FileTree(document.getElementById('filetree')!, (path) => {
      loadServerFile(path);
    });
    await fileTree.load();

    // Auto-show sidebar in server mode
    sidebarVisible = true;
    sidebar.classList.remove('sidebar-hidden');
    btnSidebar.classList.add('toolbar-btn-active');

    connectSSE();

    // Load initial file (from CLI arg) or first file in tree
    if (initialFile) {
      loadServerFile(initialFile);
      fileTree.setActive(initialFile);
    } else {
      const firstFile = sidebar.querySelector('.filetree-item[data-type="file"]') as HTMLElement;
      if (firstFile?.dataset.path) {
        loadServerFile(firstFile.dataset.path);
        fileTree.setActive(firstFile.dataset.path);
      } else {
        editor.value = SAMPLE_MARKDOWN;
        updatePreview();
      }
    }
  } else {
    // Pure frontend mode — hide sidebar button and sidebar
    sidebar.style.display = 'none';
    btnSidebar.style.display = 'none';
    editor.value = SAMPLE_MARKDOWN;
    updatePreview();
  }

  initSplit();
}

init();

// Event listeners
editor.addEventListener('input', debouncedUpdate);
btnTheme.addEventListener('click', () => {
  const newTheme = toggleTheme();
  updateMermaidTheme(newTheme === 'dark');
  updatePreview();
});
btnOpen.addEventListener('click', openFile);
btnLayout.addEventListener('click', cycleLayout);
btnSidebar.addEventListener('click', toggleSidebar);
fileInput.addEventListener('change', handleFileSelect);
document.addEventListener('drop', handleDrop);
document.addEventListener('dragover', handleDragOver);
document.addEventListener('dragleave', handleDragLeave);
document.addEventListener('keydown', handleKeyboard);

// Tab support in editor
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    debouncedUpdate();
  }
});
