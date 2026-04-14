type Theme = 'light' | 'dark';

const STORAGE_KEY = 'md-viewer-theme';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored || getSystemTheme();
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  updateIcons(theme);
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

function updateIcons(theme: Theme) {
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');
  if (sun && moon) {
    sun.style.display = theme === 'dark' ? 'none' : 'block';
    moon.style.display = theme === 'dark' ? 'block' : 'none';
  }
}

export function initTheme(): Theme {
  const theme = getTheme();
  setTheme(theme);
  return theme;
}
