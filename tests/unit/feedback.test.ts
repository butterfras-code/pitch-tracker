import { describe, expect, it } from 'vitest';
import {
  FeedbackPicker,
  resolveFeedback,
  validateFeedbackCatalog,
} from '../../src/themes/feedback';
import { FEEDBACK_CATALOG, THEME_REGISTRY } from '../../src/themes/registry';

const defaults = {
  durationMs: 1000,
  low: ['Up'],
  high: ['Down'],
  correct: ['Yes'],
};
describe('feedback catalog', () => {
  it('uses one shared duration and rejects theme timing overrides or malformed defaults', () => {
    expect(FEEDBACK_CATALOG.defaults.durationMs).toBe(1000);
    expect(() =>
      validateFeedbackCatalog(
        { defaults, themes: { comic: { durationMs: 1500 } } },
        ['comic'],
      ),
    ).toThrow(/feedback set/);
    for (const durationMs of [undefined, null, '3500', 0, 499, 30001, 500.5])
      expect(() =>
        validateFeedbackCatalog(
          { defaults: { ...defaults, durationMs }, themes: {} },
          [],
        ),
      ).toThrow(/duration/);
  });
  it('falls back per rating and replaces, rather than mixes, custom pools', () => {
    const catalog = validateFeedbackCatalog(
      { defaults, themes: { comic: { low: [], correct: ['Pow'] } } },
      ['comic'],
    );
    expect(resolveFeedback(catalog, 'comic', 'low')).toEqual(['Up']);
    expect(resolveFeedback(catalog, 'comic', 'high')).toEqual(['Down']);
    expect(resolveFeedback(catalog, 'comic', 'correct')).toEqual(['Pow']);
    expect(resolveFeedback(catalog, 'missing', 'correct')).toEqual(['Yes']);
    expect(resolveFeedback(catalog, 'toString', 'correct')).toEqual(['Yes']);
  });
  it('ships complete generic and Boom Pow sets, with other themes inheriting', () => {
    for (const rating of ['low', 'correct', 'high'] as const) {
      expect(
        resolveFeedback(FEEDBACK_CATALOG, 'boom-pow', rating).length,
      ).toBeGreaterThan(1);
      expect(FEEDBACK_CATALOG.defaults[rating].length).toBeGreaterThan(1);
      for (const theme of THEME_REGISTRY.filter((t) => t.id !== 'boom-pow'))
        expect(resolveFeedback(FEEDBACK_CATALOG, theme.id, rating)).toBe(
          FEEDBACK_CATALOG.defaults[rating],
        );
    }
  });
  it('rejects malformed defaults, unknown themes/ratings and invalid phrases', () => {
    for (const value of [
      null,
      {},
      { defaults, themes: [] },
      { defaults: { low: ['Up'] }, themes: {} },
      { defaults: { ...defaults, correct: [] }, themes: {} },
      { defaults, themes: { typo: {} } },
      { defaults, themes: { comic: { typo: ['a'] } } },
      ...[
        null,
        'text',
        [''],
        [' '],
        [' a'],
        [2],
        ['a', 'a'],
        ['a'.repeat(101)],
      ].map((correct) => ({ defaults, themes: { comic: { correct } } })),
    ])
      expect(() => validateFeedbackCatalog(value, ['comic'])).toThrow();
  });
});

describe('feedback shuffle bags', () => {
  it('uses every phrase before repeating and avoids repeats across bag boundaries', () => {
    const picker = new FeedbackPicker(() => 0.5);
    const phrases = ['a', 'b', 'c'];
    const results = Array.from({ length: 30 }, () => picker.next(phrases));
    for (let i = 0; i < results.length; i += 3)
      expect(new Set(results.slice(i, i + 3))).toEqual(new Set(phrases));
    expect(
      results.every((value, i) => i === 0 || value !== results[i - 1]),
    ).toBe(true);
    expect(phrases).toEqual(['a', 'b', 'c']);
  });
  it('isolates pools and application instances and handles one phrase', () => {
    const first = new FeedbackPicker(() => 0);
    const second = new FeedbackPicker(() => 0);
    const phrases = ['a', 'b'];
    expect(first.next(phrases)).toBe(second.next(phrases));
    const single = ['one'];
    expect([first.next(single), first.next(single)]).toEqual(['one', 'one']);
    expect(first.next(phrases)).toBe(second.next(phrases));
    expect(() => first.next([])).toThrow();
  });
});
