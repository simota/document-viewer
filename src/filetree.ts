export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileNode[];
}

interface TreeResponse {
  root: string;
  path: string;
  tree: FileNode[];
}

type FileSelectCallback = (path: string) => void;

const ICON_FILE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const ICON_DIR_CLOSED = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
const ICON_DIR_OPEN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
const ICON_CHEVRON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

export class FileTree {
  private container: HTMLElement;
  private rootLabel: HTMLElement;
  private treeList: HTMLElement;
  private onSelect: FileSelectCallback;
  private activePath: string | null = null;
  private openDirs = new Set<string>();

  constructor(container: HTMLElement, onSelect: FileSelectCallback) {
    this.container = container;
    this.onSelect = onSelect;

    this.rootLabel = document.createElement('div');
    this.rootLabel.className = 'filetree-root';

    this.treeList = document.createElement('div');
    this.treeList.className = 'filetree-list';

    this.container.appendChild(this.rootLabel);
    this.container.appendChild(this.treeList);
  }

  async load(): Promise<void> {
    try {
      const res = await fetch('/api/tree');
      if (!res.ok) return;
      const data: TreeResponse = await res.json();
      this.rootLabel.textContent = data.root;
      this.renderTree(data.tree, this.treeList, 0);
    } catch {
      // Server mode not available — hide sidebar
      this.container.style.display = 'none';
    }
  }

  private renderTree(nodes: FileNode[], parent: HTMLElement, depth: number) {
    parent.innerHTML = '';
    for (const node of nodes) {
      const item = document.createElement('div');
      item.className = 'filetree-item';
      item.dataset.path = node.path;
      item.dataset.type = node.type;
      item.style.paddingLeft = `${12 + depth * 16}px`;

      if (node.type === 'dir') {
        const isOpen = this.openDirs.has(node.path);
        item.innerHTML = `<span class="filetree-chevron ${isOpen ? 'open' : ''}">${ICON_CHEVRON}</span>${isOpen ? ICON_DIR_OPEN : ICON_DIR_CLOSED}<span class="filetree-name">${node.name}</span>`;

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'filetree-children';
        childrenContainer.style.display = isOpen ? '' : 'none';

        if (isOpen && node.children) {
          this.renderTree(node.children, childrenContainer, depth + 1);
        }

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.openDirs.has(node.path)) {
            this.openDirs.delete(node.path);
          } else {
            this.openDirs.add(node.path);
          }
          // Re-render this subtree
          const isNowOpen = this.openDirs.has(node.path);
          const chevron = item.querySelector('.filetree-chevron') as HTMLElement;
          if (chevron) chevron.classList.toggle('open', isNowOpen);
          item.innerHTML = `<span class="filetree-chevron ${isNowOpen ? 'open' : ''}">${ICON_CHEVRON}</span>${isNowOpen ? ICON_DIR_OPEN : ICON_DIR_CLOSED}<span class="filetree-name">${node.name}</span>`;
          childrenContainer.style.display = isNowOpen ? '' : 'none';
          if (isNowOpen && node.children) {
            this.renderTree(node.children, childrenContainer, depth + 1);
          }
        });

        parent.appendChild(item);
        parent.appendChild(childrenContainer);
      } else {
        item.innerHTML = `<span class="filetree-chevron-spacer"></span>${ICON_FILE}<span class="filetree-name">${node.name}</span>`;
        if (this.activePath === node.path) {
          item.classList.add('active');
        }
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setActive(node.path);
          this.onSelect(node.path);
        });
        parent.appendChild(item);
      }
    }
  }

  setActive(path: string) {
    this.activePath = path;
    this.container.querySelectorAll('.filetree-item.active').forEach((el) => el.classList.remove('active'));
    const el = this.container.querySelector(`.filetree-item[data-path="${CSS.escape(path)}"][data-type="file"]`);
    if (el) el.classList.add('active');
  }

  refresh() {
    this.load();
  }
}
