import { $ } from './helpers';

interface Theme {
  id: string;
  name: string;
  treatment?: string;
  tokens: Record<string, string>;
}

// THEME REGISTRY: copy an entry, choose a unique id/name, and override tokens.
// Missing tokens inherit Classic. The selector populates automatically.
// All assets are local/system fonts, so themes work offline.
export const THEME_REGISTRY: Theme[] = [
  {
    id: 'cel-mech',
    name: 'Cel-Shaded Mech',
    treatment: 'mech',
    tokens: {
      bg: '#111115',
      card: '#18181c',
      ink: '#f5f5f7',
      muted: '#b5b5c3',
      line: '#535361',
      accent: '#00c2ff',
      soft: '#30303b',
      low: '#001b26',
      high: '#26000b',
      danger: '#ff83a2',
      control: '#24242c',
      'primary-ink': '#111115',
      'primary-hover': '#fff36a',
      'badge-bg': '#343440',
      'low-bg': '#65d9ff',
      correct: '#172000',
      'correct-bg': '#e7f58b',
      'high-bg': '#ff83a2',
      'help-bg': '#24242c',
      track: '#42424d',
      'focus-ring': '#ffe600',
      'notice-bg': '#ffe600',
      'notice-ink': '#171700',
      radius: '3px',
      'control-radius': '2px',
      'panel-shadow': '5px 5px 0 #ff2e63',
      'button-shadow': '2px 2px 0 #000',
      'heading-font': '"Arial Black", "Trebuchet MS", sans-serif',
      'body-font': '"Trebuchet MS", system-ui, sans-serif',
      edge: '#ff2e63',
      highlight: '#ffe600',
      'page-pattern':
        'repeating-linear-gradient(135deg, transparent, transparent 12px, #ffffff03 12px, #ffffff03 24px)',
      scheme: 'dark',
    },
  },
  { id: 'classic', name: 'Classic Studio', tokens: {} },
];
const DEFAULT_THEME = 'cel-mech';
const THEME_STORAGE_KEY = 'mouthpiece.pitchtracker.theme.v1';
let appliedThemeTokens: string[] = [];
function applyTheme(id: string) {
  const theme =
    THEME_REGISTRY.find((theme) => theme.id === id) ||
    THEME_REGISTRY.find((theme) => theme.id === DEFAULT_THEME)!;
  const root = document.documentElement;
  appliedThemeTokens.forEach((key) => root.style.removeProperty('--' + key));
  Object.entries(theme.tokens).forEach(([key, value]) =>
    root.style.setProperty('--' + key, value),
  );
  appliedThemeTokens = Object.keys(theme.tokens);
  root.dataset.theme = theme.id;
  root.dataset.treatment = theme.treatment || '';
  const selector = $('themeSelect');
  if (selector) selector.value = theme.id;
  return theme;
}
export function initializeThemes(toast: (message: string) => void): () => void {
  let savedTheme;
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    /* Theme storage is optional. */
  }
  applyTheme(savedTheme || DEFAULT_THEME);

  const controller = new AbortController();
  const themeSelect = $('themeSelect');
  themeSelect.replaceChildren();
  THEME_REGISTRY.forEach((theme) =>
    themeSelect.add(new Option(theme.name, theme.id)),
  );
  themeSelect.value = document.documentElement.dataset.theme!;
  themeSelect.addEventListener(
    'change',
    () => {
      const theme = applyTheme(themeSelect.value);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme.id);
      } catch {
        toast(
          'Theme applied for this visit. Browser storage could not save your preference.',
        );
      }
    },
    { signal: controller.signal },
  );
  window.addEventListener(
    'storage',
    (event) => {
      if (event.key === THEME_STORAGE_KEY)
        applyTheme(event.newValue || DEFAULT_THEME);
    },
    { signal: controller.signal },
  );
  return () => controller.abort();
}
