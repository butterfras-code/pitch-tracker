import type { PitchStatus } from '../domain/pitch';

export type FeedbackSet = Record<PitchStatus, readonly string[]>;
export interface FeedbackCatalog {
  defaults: FeedbackSet & { durationMs: number };
  themes: Record<string, Partial<FeedbackSet>>;
}
const ratings = ['low', 'high', 'correct'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Developer-authored, build-bundled text. Reject typos rather than hiding them. */
export function validateFeedbackCatalog(
  value: unknown,
  themeIds: readonly string[],
): FeedbackCatalog {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['defaults', 'themes'].includes(key)) ||
    !isRecord(value.themes)
  )
    throw new Error('Invalid feedback catalog');
  const validateSet = (set: unknown, required: boolean, path: string) => {
    if (
      !isRecord(set) ||
      Object.keys(set).some(
        (key) =>
          !(required && key === 'durationMs') &&
          !ratings.includes(key as PitchStatus),
      ) ||
      (required && ratings.some((rating) => !Object.hasOwn(set, rating)))
    )
      throw new Error(`Invalid feedback set: ${path}`);
    if (required) {
      if (
        typeof set.durationMs !== 'number' ||
        !Number.isInteger(set.durationMs) ||
        set.durationMs < 500 ||
        set.durationMs > 30000
      )
        throw new Error(
          `Invalid feedback duration: ${path}.durationMs (500–30000 milliseconds)`,
        );
    }
    for (const [rating, phrases] of Object.entries(set)) {
      if (rating === 'durationMs') continue;
      if (
        !Array.isArray(phrases) ||
        (required && phrases.length === 0) ||
        phrases.some(
          (phrase) =>
            typeof phrase !== 'string' ||
            !phrase.trim() ||
            phrase !== phrase.trim() ||
            phrase.length > 100,
        ) ||
        new Set(phrases).size !== phrases.length
      )
        throw new Error(`Invalid feedback phrases: ${path}.${rating}`);
    }
  };
  validateSet(value.defaults, true, 'defaults');
  for (const [id, set] of Object.entries(value.themes)) {
    if (!themeIds.includes(id))
      throw new Error(`Unknown feedback theme: ${id}`);
    validateSet(set, false, id);
  }
  return value as unknown as FeedbackCatalog;
}

export function resolveFeedback(
  catalog: FeedbackCatalog,
  themeId: string,
  rating: PitchStatus,
): readonly string[] {
  const custom = Object.hasOwn(catalog.themes, themeId)
    ? catalog.themes[themeId][rating]
    : undefined;
  return custom?.length ? custom : catalog.defaults[rating];
}

/** Per-instance shuffle bags; randomness is injectable for behavioral tests. */
export class FeedbackPicker {
  private bags = new Map<
    readonly string[],
    { remaining: string[]; last?: string }
  >();
  constructor(private random: () => number = Math.random) {}

  next(phrases: readonly string[]): string {
    if (!phrases.length)
      throw new Error('Feedback requires at least one phrase');
    let bag = this.bags.get(phrases);
    if (!bag) {
      bag = { remaining: [] };
      this.bags.set(phrases, bag);
    }
    if (!bag.remaining.length) {
      bag.remaining = [...phrases];
      for (let i = bag.remaining.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [bag.remaining[i], bag.remaining[j]] = [
          bag.remaining[j],
          bag.remaining[i],
        ];
      }
      const end = bag.remaining.length - 1;
      if (end > 0 && bag.remaining[end] === bag.last)
        [bag.remaining[0], bag.remaining[end]] = [
          bag.remaining[end],
          bag.remaining[0],
        ];
    }
    bag.last = bag.remaining.pop()!;
    return bag.last;
  }
}
