import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOKENS,
  THEME_TREATMENTS,
  resolveTokens,
  validateThemes,
  type ThemeDefinition,
} from '../../src/themes/contract';
import { THEME_REGISTRY } from '../../src/themes/registry';

describe('theme contract', () => {
  it('discovers theme files but excludes the copyable template', () => {
    expect(THEME_REGISTRY.map((theme) => theme.id)).toEqual([
      'big-button',
      'boom-pow',
      'cel-mech',
      'lisa-lives',
      'pitch-press',
      'vintage-audio',
    ]);
    expect(THEME_REGISTRY.some((theme) => theme.id === 'your-theme')).toBe(
      false,
    );
    expect(validateThemes(THEME_REGISTRY)).toBe(THEME_REGISTRY);
  });
  it('resolves partial definitions without leaking overrides or mutating defaults', () => {
    const changed = resolveTokens({
      id: 'test',
      name: 'Test',
      tokens: { bg: '#000', 'heading-shadow': '2px 2px red' },
    });
    expect(changed.bg).toBe('#000');
    expect(changed.card).toBe(DEFAULT_TOKENS.card);
    const baseline = resolveTokens({
      id: 'baseline',
      name: 'Baseline',
      tokens: {},
    });
    expect(baseline).toEqual(DEFAULT_TOKENS);
    expect(baseline['heading-shadow']).toBe('none');
  });
  it('rejects duplicate IDs, unknown keys and remote assets', () => {
    const theme = { id: 'test', name: 'Test', tokens: {} };
    expect(() => validateThemes([theme, theme])).toThrow(/duplicate/);
    for (const tokens of [
      { typo: 'red' },
      { bg: '' },
      { 'page-pattern': 'url(https://example.com/bg.png)' },
    ]) {
      expect(() =>
        validateThemes([{ ...theme, tokens } as ThemeDefinition]),
      ).toThrow(/token/);
    }
  });
  it('accepts the treatment vocabulary and independently styled display', () => {
    for (const treatment of THEME_TREATMENTS) {
      const theme: ThemeDefinition = {
        id: `test-${treatment}`,
        name: 'Appearance test',
        treatment,
        tokens: {
          'card-ink': '#222',
          'control-ink': '#111',
          'display-bg': '#171717',
          'display-ink': '#ffd180',
          'data-font': 'monospace',
          'label-font': 'sans-serif',
          'heading-weight': '900',
          'label-weight': '700',
          'label-tracking': '0.08em',
          'label-transform': 'uppercase',
          'display-shadow': 'inset 0 2px 6px #000',
          'button-pressed-shadow': 'inset 0 2px 3px #0004',
          scheme: 'dark',
        },
      };
      expect(validateThemes([theme])).toEqual([theme]);
      expect(resolveTokens(theme)).toMatchObject(theme.tokens);
    }
  });
  it('lets new defaults follow the selected palette and resets extensions', () => {
    const resolved = resolveTokens({
      id: 'dark',
      name: 'Dark',
      tokens: { ink: '#fff', card: '#111' },
    });
    expect(resolved['card-ink']).toBe('var(--ink)');
    expect(resolved['control-ink']).toBe('var(--ink)');
    expect(resolved['display-bg']).toBe('var(--card)');
    expect(resolved['display-ink']).toBe('var(--card-ink)');
    expect(resolved['data-font']).toBe('var(--body-font)');
    expect(resolved['label-font']).toBe('var(--body-font)');
    resolveTokens({
      id: 'custom',
      name: 'Custom',
      tokens: { 'display-ink': 'red' },
    });
    expect(
      resolveTokens({ id: 'baseline', name: 'Baseline', tokens: {} }),
    ).toEqual(DEFAULT_TOKENS);
  });
  it('rejects invalid untyped enums and malformed definitions', () => {
    const base = { id: 'test', name: 'Test', tokens: {} };
    for (const value of [
      null,
      { ...base, tokens: null },
      { ...base, tokens: [] },
      { ...base, tokens: { scheme: 'banana' } },
      { ...base, tokens: { scheme: 'var(--scheme)' } },
      { ...base, tokens: { 'display-ink': 123 } },
      { ...base, treatment: 'unknown' },
      { ...base, treatment: null },
      { ...base, treatment: 123 },
      { ...base, id: 123 },
      { ...base, name: 123 },
      { ...base, meter: 'needle' },
    ]) {
      expect(() =>
        validateThemes([value as unknown as ThemeDefinition]),
      ).toThrow(/Invalid/);
    }
  });
  it('keeps local and embedded URL assets disallowed too', () => {
    for (const value of [
      'url(./texture.png)',
      'URL(data:image/png;base64,AA==)',
      '@import "font.css"',
    ]) {
      expect(() =>
        validateThemes([
          {
            id: 'test',
            name: 'Test',
            tokens: { 'surface-pattern': value },
          },
        ]),
      ).toThrow(/disallowed theme token/);
    }
  });
});
