import { $ } from './helpers';
import { THEME_REGISTRY, DEFAULT_THEME } from '../themes/registry';
import { resolveTokens } from '../themes/contract';

const THEME_STORAGE_KEY = 'mouthpiece.pitchtracker.theme.v1';
function applyTheme(id: string) {
  const theme =
    THEME_REGISTRY.find((theme) => theme.id === id) ||
    THEME_REGISTRY.find((theme) => theme.id === DEFAULT_THEME)!;
  const root = document.documentElement;
  Object.entries(resolveTokens(theme)).forEach(([key, value]) =>
    root.style.setProperty('--' + key, value),
  );
  root.dataset.theme = theme.id;
  root.dataset.treatment = theme.treatment || '';
  const selector = $('themeSelect');
  if (selector) selector.value = theme.id;
  return theme;
}
export function initializeThemes(
  toast: (message: string) => void,
  onThemeChange: () => void = () => {},
): () => void {
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
      onThemeChange();
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
      if (event.key === THEME_STORAGE_KEY) {
        onThemeChange();
        applyTheme(event.newValue || DEFAULT_THEME);
      }
    },
    { signal: controller.signal },
  );
  return () => controller.abort();
}
