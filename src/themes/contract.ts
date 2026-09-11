// Appearance only: geometry, breakpoints, hit targets and music artwork stay in CSS/SVG.
export const DEFAULT_TOKENS = {
  'range-animation': 'range-glow 1.4s ease-in-out infinite alternate',
  bg: '#f5f4ef',
  card: '#fff',
  ink: '#24332f',
  muted: '#69766f',
  line: '#dce3dc',
  accent: '#246b55',
  soft: '#e6f1ea',
  low: '#29638c',
  high: '#a2443e',
  danger: '#a2443e',
  control: '#fff',
  'primary-ink': '#fff',
  'primary-hover': '#194e3e',
  'badge-bg': '#edf0eb',
  'low-bg': '#e9f2fa',
  correct: '#216047',
  'correct-bg': '#e1f2e8',
  'high-bg': '#fbece9',
  'help-bg': '#f4f6f1',
  track: '#e8ede7',
  'focus-ring': '#d79f36',
  'notice-bg': '#fff0ca',
  'notice-ink': '#624b15',
  radius: '14px',
  'control-radius': '9px',
  'panel-shadow': 'none',
  'button-shadow': 'none',
  'heading-font': 'system-ui, sans-serif',
  'body-font': 'system-ui, sans-serif',
  'page-pattern': 'none',
  edge: '#dce3dc',
  highlight: '#246b55',
  scheme: 'light' as 'light' | 'dark',
  'surface-pattern': 'none',
  'control-pattern': 'none',
  'surface-border-style': 'solid',
  'surface-shadow': 'none',
  'display-radius': '12px',
  'badge-radius': '6px',
  'help-radius': '8px',
  'toast-radius': '10px',
  'feedback-font': 'var(--body-font)',
  'feedback-weight': '700',
  'feedback-transform': 'none',
  'feedback-shadow': 'none',
  'feedback-border': 'var(--feedback-ink)',
  'feedback-animation': 'feedback-arrive 180ms ease-out',
  'heading-style': 'normal',
  'heading-transform': 'none',
  'heading-shadow': 'none',
  'note-shadow': 'none',
  'button-weight': '600',
  backdrop: '#14271c88',
  'slider-track': '#8885',
  'slider-band': '#319c63',
  'slider-handle': '#6689cc',
  'slider-target': '#b47626',

  // Shared CSS consumes these appearance values without changing geometry.
  // References inherit the selected palette instead of forcing the default ink
  // onto an existing dark theme. Theme files may override each independently.
  'card-ink': 'var(--ink)',
  'control-ink': 'var(--ink)',
  'display-bg': 'var(--card)',
  'display-ink': 'var(--card-ink)',

  // Numerical readings and equipment labels; font assets remain build-owned.
  'data-font': 'var(--body-font)',
  'label-font': 'var(--body-font)',
  'heading-weight': '700',
  'label-weight': '600',
  'label-tracking': 'normal',
  'label-transform': 'none',

  'display-shadow': 'none',
  'button-pressed-shadow': 'none',
};
export type ThemeTokens = typeof DEFAULT_TOKENS;

// Shared vocabulary for theme authors. Mech and print have CSS implemented;
// the other treatments are reserved for the next shared-styling implementation.
export const THEME_TREATMENTS = [
  'mech',
  'print',
  'comic',
  'studio',
  'modular',
  'toy',
  'rave',
  'roadcase',
  'arcade',
] as const;
export type ThemeTreatment = (typeof THEME_TREATMENTS)[number];

export interface ThemeDefinition {
  id: string;
  name: string;
  /** Selects shared decoration; never owns layout, music artwork or scoring. */
  treatment?: ThemeTreatment;
  tokens: Partial<ThemeTokens>;
}
export function resolveTokens(theme: ThemeDefinition): ThemeTokens {
  return { ...DEFAULT_TOKENS, ...theme.tokens };
}
export function validateThemes(themes: ThemeDefinition[]): ThemeDefinition[] {
  const ids = new Set<string>();
  for (const theme of themes) {
    if (
      !isRecord(theme) ||
      Object.keys(theme).some(
        (key) => !['id', 'name', 'treatment', 'tokens'].includes(key),
      ) ||
      !isRecord(theme.tokens)
    ) {
      throw new Error('Invalid theme definition');
    }
    if (
      typeof theme.id !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(theme.id) ||
      typeof theme.name !== 'string' ||
      !theme.name.trim() ||
      ids.has(theme.id)
    ) {
      throw new Error(`Invalid or duplicate theme: ${theme.id}`);
    }
    ids.add(theme.id);
    if (
      theme.treatment !== undefined &&
      !THEME_TREATMENTS.includes(theme.treatment)
    ) {
      throw new Error(`Invalid theme treatment: ${theme.id}`);
    }
    for (const [key, value] of Object.entries(theme.tokens)) {
      if (
        !Object.hasOwn(DEFAULT_TOKENS, key) ||
        typeof value !== 'string' ||
        !value.trim() ||
        /url\s*\(|@import/i.test(value) ||
        (key === 'scheme' && value !== 'light' && value !== 'dark')
      ) {
        throw new Error(
          `Invalid or disallowed theme token: ${theme.id}.${key}`,
        );
      }
    }
  }
  return themes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
