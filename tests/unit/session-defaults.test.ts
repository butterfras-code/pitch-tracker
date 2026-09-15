import { describe, expect, it } from 'vitest';
import { migrateToV2, migrateToV3, parseBackup } from '../../src/domain/backup';
import { fresh } from '../../src/domain/defaults';
import { sessionDefaults } from '../../src/domain/session-defaults';
import {
  createTrackerStore,
  TRACKER_KEY,
} from '../../src/persistence/tracker-store';
import { trackerFixture } from '../fixtures/tracker';

describe('versioned session defaults', () => {
  it('defaults new installations to automatic advancement after one attempt', () => {
    expect(sessionDefaults(fresh())).toMatchObject({
      advance: true,
      mode: 'one-and-done',
    });
  });
  it('preserves an explicitly saved until-correct preference', () => {
    const data = migrateToV3(trackerFixture());
    data.sessionDefaults!.mode = 'until-correct';
    expect(sessionDefaults(parseBackup(JSON.stringify(data))).mode).toBe(
      'until-correct',
    );
  });
  it.each([1, 2])(
    'upgrades v%s losslessly and round-trips defaults through storage and backup',
    (schema) => {
      const original =
        schema === 1 ? trackerFixture() : migrateToV2(trackerFixture());
      original.settings.advance = true;
      const before = JSON.stringify(original);
      const next = migrateToV3(original);
      expect(JSON.stringify(original)).toBe(before);
      expect(next.schema).toBe(3);
      expect(next.sessionDefaults).toEqual({
        advance: true,
        mode: 'one-and-done',
        claps: false,
        teacher: false,
        view: 'auto',
      });
      expect(next.sessions).toEqual(migrateToV2(original).sessions);
      next.sessionDefaults = {
        advance: false,
        mode: 'one-and-done',
        claps: true,
        teacher: true,
        view: 'class',
      };
      const values = new Map<string, string>();
      const store = createTrackerStore({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
      });
      store.save(next);
      const exported = JSON.stringify(store.load().data);
      const restored = store.restore(parseBackup(exported));
      expect(restored.sessionDefaults).toEqual(next.sessionDefaults);
      expect(restored.sessions).toEqual(next.sessions);
      expect(migrateToV2(next)).toEqual(next);
      expect(migrateToV3(next)).toEqual(next);
    },
  );
  it.each([
    null,
    {},
    { advance: 'yes' },
    { mode: 'random' },
    { claps: 1 },
    { teacher: null },
    { view: 'fullscreen' },
  ])('rejects invalid defaults without overwriting storage: %j', (invalid) => {
    const data = migrateToV3(trackerFixture());
    const values = new Map([[TRACKER_KEY, JSON.stringify(data)]]);
    const before = [...values];
    const store = createTrackerStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
    });
    const incoming = {
      ...data,
      sessionDefaults:
        invalid && Object.keys(invalid).length
          ? { ...data.sessionDefaults, ...invalid }
          : invalid,
    };
    expect(() => store.restore(incoming)).toThrow();
    expect([...values]).toEqual(before);
  });
  it('does not interpret extension fields on old versions as defaults', () => {
    const data = trackerFixture();
    data.sessionDefaults = {
      advance: true,
      mode: 'one-and-done',
      claps: true,
      teacher: true,
      view: 'class',
    };
    expect(sessionDefaults(data).claps).toBe(false);
    expect(migrateToV3(data).sessionDefaults?.teacher).toBe(false);
  });
});
