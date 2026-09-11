import { describe, expect, it } from 'vitest';
import { evaluate, targetFrequency } from '../../src/domain/pitch';
import {
  migrateToV2,
  parseBackup,
  validateBackup,
} from '../../src/domain/backup';
import { trackerFixture } from '../fixtures/tracker';
import {
  createTrackerStore,
  TRACKER_KEY,
} from '../../src/persistence/tracker-store';

describe('custom target tuning and versioned data', () => {
  it('moves the reference tone and inclusive scoring bounds together', () => {
    const target = { pitch: 'A4', offset: 18, min: -25, max: 25 };
    const frequency = 442 * 2 ** (18 / 1200);
    expect(targetFrequency(target, 442)).toBeCloseTo(frequency, 8);
    expect(evaluate(frequency, target, 442).cents).toBeCloseTo(0, 8);
    for (const [cents, status] of [
      [-26, 'low'],
      [-25, 'correct'],
      [25, 'correct'],
      [26, 'high'],
    ] as const)
      expect(
        evaluate(frequency * 2 ** (cents / 1200), target, 442).status,
      ).toBe(status);
    expect(
      evaluate(frequency * 2, { ...target, pitch: 'A' }, 442).cents,
    ).toBeCloseTo(0, 8);
    expect(evaluate(frequency * 2, target, 442).status).toBe('high');
  });
  it('upgrades v1 without mutating it or changing past measurements, and round-trips v2', () => {
    const original = trackerFixture(),
      before = JSON.stringify(original);
    const next = migrateToV2(original);
    expect(JSON.stringify(original)).toBe(before);
    expect(next.schema).toBe(2);
    expect(next.sessions[0].attempts[0]).toEqual({
      ...original.sessions[0].attempts[0],
      target: { ...original.sessions[0].attempts[0].target, offset: 0 },
    });
    next.configs.Flute.offset = 18;
    expect(parseBackup(JSON.stringify(next))).toEqual(next);
    expect(migrateToV2(next)).toEqual(next);
    expect(parseBackup(before)).toEqual(original);
  });
  it.each([NaN, Infinity, -601, 601, '18', null])(
    'rejects invalid v2 offsets (%s) without overwriting valid data',
    (offset) => {
      const data = migrateToV2(trackerFixture());
      const values = new Map([[TRACKER_KEY, JSON.stringify(data)]]);
      const before = [...values];
      const store = createTrackerStore({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
      });
      Object.assign(data.configs.Flute, { offset });
      expect(() => store.restore(data)).toThrow();
      expect([...values]).toEqual(before);
    },
  );
  it('does not interpret v1 fields as custom tuning and rejects future versions', () => {
    const data = trackerFixture();
    data.configs.Flute.offset = 18;
    expect(() => validateBackup(data)).toThrow();
    expect(() => validateBackup({ ...data, schema: 3 })).toThrow();
  });
});
