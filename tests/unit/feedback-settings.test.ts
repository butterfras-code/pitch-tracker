import { describe, expect, it } from 'vitest';
import {
  migrateToV2,
  withFeedbackDuration,
  parseBackup,
} from '../../src/domain/backup';
import { trackerFixture } from '../fixtures/tracker';
import {
  createTrackerStore,
  TRACKER_KEY,
} from '../../src/persistence/tracker-store';

describe('saved feedback timing', () => {
  it('upgrades v1 and v2 explicitly, preserving measurements and source data', () => {
    for (const old of [trackerFixture(), migrateToV2(trackerFixture())]) {
      const before = JSON.stringify(old);
      const upgraded = withFeedbackDuration(old, 2500);
      expect(JSON.stringify(old)).toBe(before);
      expect(upgraded.schema).toBe(3);
      expect(upgraded.settings).toEqual({
        ...old.settings,
        feedbackDurationMs: 2500,
      });
      expect(upgraded.sessions).toEqual(migrateToV2(old).sessions);
      expect(upgraded.configs).toEqual(migrateToV2(old).configs);
      expect(migrateToV2(upgraded)).toEqual(upgraded);
      expect(parseBackup(before)).toEqual(old);
    }
  });
  it.each([null, 500, 3500, 30000])(
    'round trips the preference %s through export, import and reload',
    (duration) => {
      const data = withFeedbackDuration(trackerFixture(), duration);
      const exported = JSON.stringify(data);
      const values = new Map<string, string>();
      const store = createTrackerStore({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
      });
      const restored = store.restore(parseBackup(exported));
      expect({ ...restored, revision: data.revision }).toEqual(data);
      expect(store.load().data).toEqual(restored);
    },
  );
  it.each([undefined, '2000', 0, -1, 499, 30001, 500.5, true, NaN, Infinity])(
    'rejects invalid imported timing %s before overwriting any data',
    (duration) => {
      const data = withFeedbackDuration(trackerFixture(), 2000);
      const values = new Map([[TRACKER_KEY, JSON.stringify(data)]]);
      const before = [...values];
      const store = createTrackerStore({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
      });
      Object.assign(data.settings, { feedbackDurationMs: duration });
      expect(() => store.restore(data)).toThrow();
      expect([...values]).toEqual(before);
    },
  );
  it('does not silently interpret timing under an older schema', () => {
    const data = trackerFixture();
    data.settings.feedbackDurationMs = 2000;
    expect(() => parseBackup(JSON.stringify(data))).toThrow();
  });
});
