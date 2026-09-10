import { describe, expect, it } from 'vitest';
import {
  createTrackerStore,
  RECOVERY_KEY,
  TRACKER_KEY,
  StorageConflictError,
  type KeyValueStorage,
} from '../../src/persistence/tracker-store';
import { trackerFixture } from '../fixtures/tracker';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  failReads = false;
  failWriteKey: string | null = null;
  getItem(key: string) {
    if (this.failReads) throw new Error('Access denied');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWriteKey === key) throw new Error('Quota exceeded');
    this.values.set(key, value);
  }
}

describe('tracker storage', () => {
  it('loads empty storage and saves/reloads without changing the schema', () => {
    const storage = new MemoryStorage(),
      store = createTrackerStore(storage),
      data = trackerFixture();
    expect(store.load()).toEqual({ blocked: false, raw: null, data: null });
    store.save(data);
    expect(data.revision).toBe(5);
    expect(store.load().data).toEqual(data);
  });
  it.each(['{broken', '{"schema":2}'])(
    'preserves corrupt stored data: %s',
    (raw) => {
      const storage = new MemoryStorage();
      storage.values.set(TRACKER_KEY, raw);
      expect(createTrackerStore(storage).load()).toEqual({
        blocked: true,
        raw,
        data: null,
      });
      expect(storage.getItem(TRACKER_KEY)).toBe(raw);
    },
  );
  it('handles unavailable storage on read without writing a replacement', () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    expect(createTrackerStore(storage).load()).toEqual({
      blocked: true,
      raw: null,
      data: null,
    });
    expect(storage.values.size).toBe(0);
  });
  it('rejects stale window saves and preserves the newer stored version', () => {
    const storage = new MemoryStorage(),
      store = createTrackerStore(storage),
      first = trackerFixture(),
      second = trackerFixture();
    storage.setItem(TRACKER_KEY, JSON.stringify(first));
    store.save(first);
    const saved = storage.getItem(TRACKER_KEY);
    expect(() => store.save(second)).toThrow(StorageConflictError);
    expect(storage.getItem(TRACKER_KEY)).toBe(saved);
    expect(second.revision).toBe(4);
  });
  it('does not advance revision or overwrite stored data when a save fails', () => {
    const storage = new MemoryStorage(),
      data = trackerFixture();
    const original = JSON.stringify(data);
    storage.setItem(TRACKER_KEY, original);
    storage.failWriteKey = TRACKER_KEY;
    expect(() => createTrackerStore(storage).save(data)).toThrow(
      'Quota exceeded',
    );
    expect(data.revision).toBe(4);
    expect(storage.getItem(TRACKER_KEY)).toBe(original);
  });
  it('validates imports before any writes and preserves the recovery slot', () => {
    const storage = new MemoryStorage();
    storage.setItem(TRACKER_KEY, 'original');
    storage.setItem(RECOVERY_KEY, 'recovery');
    expect(() => createTrackerStore(storage).restore({ schema: 2 })).toThrow();
    expect([...storage.values]).toEqual([
      [TRACKER_KEY, 'original'],
      [RECOVERY_KEY, 'recovery'],
    ]);
  });
  it('restores a backup with a new revision and retains a recovery copy', () => {
    const storage = new MemoryStorage(),
      incoming = trackerFixture();
    const previous = JSON.stringify({ ...incoming, revision: 12 });
    storage.setItem(TRACKER_KEY, previous);
    const restored = createTrackerStore(storage).restore(incoming);
    expect(restored).toEqual({ ...incoming, revision: 13 });
    expect(incoming.revision).toBe(4);
    expect(storage.getItem(RECOVERY_KEY)).toBe(previous);
    expect(JSON.parse(storage.getItem(TRACKER_KEY)!)).toEqual(restored);
  });
  it.each([RECOVERY_KEY, TRACKER_KEY])(
    'keeps the current data if restoration fails writing %s',
    (failKey) => {
      const storage = new MemoryStorage(),
        incoming = trackerFixture();
      storage.setItem(TRACKER_KEY, 'original');
      storage.failWriteKey = failKey;
      expect(() => createTrackerStore(storage).restore(incoming)).toThrow(
        'Quota exceeded',
      );
      expect(storage.getItem(TRACKER_KEY)).toBe('original');
      expect(incoming.revision).toBe(4);
    },
  );
  it('can restore over unreadable storage while retaining its raw recovery copy', () => {
    const storage = new MemoryStorage();
    storage.setItem(TRACKER_KEY, '{broken');
    expect(createTrackerStore(storage).restore(trackerFixture()).revision).toBe(
      1,
    );
    expect(storage.getItem(RECOVERY_KEY)).toBe('{broken');
  });
});
