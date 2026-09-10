import { parseBackup, validateBackup } from '../domain/backup';
import type { TrackerData } from '../domain/tracker';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const TRACKER_KEY = 'mouthpiece.pitchtracker.v1';
export const RECOVERY_KEY = TRACKER_KEY + '.recovery';
export class StorageConflictError extends Error {
  constructor() {
    super('Another window changed this tracker.');
  }
}
export type LoadResult =
  | { blocked: false; raw: string | null; data: TrackerData | null }
  | { blocked: true; raw: string | null; data: null };

export function createTrackerStore(storage: KeyValueStorage) {
  return {
    load(): LoadResult {
      let raw: string | null = null;
      try {
        raw = storage.getItem(TRACKER_KEY);
        return { blocked: false, raw, data: raw ? parseBackup(raw) : null };
      } catch {
        return { blocked: true, raw, data: null };
      }
    },
    save(data: TrackerData): void {
      const raw = storage.getItem(TRACKER_KEY);
      if (raw && JSON.parse(raw).revision !== data.revision)
        throw new StorageConflictError();
      const revision = data.revision + 1;
      storage.setItem(TRACKER_KEY, JSON.stringify({ ...data, revision }));
      // A failed write must not advance the in-memory revision.
      data.revision = revision;
    },
    restore(value: unknown): TrackerData {
      const incoming = validateBackup(value);
      const raw = storage.getItem(TRACKER_KEY);
      if (raw) storage.setItem(RECOVERY_KEY, raw);
      let priorRevision = 0;
      try {
        priorRevision = JSON.parse(raw ?? 'null')?.revision || 0;
      } catch {
        /* Recovery copy preserves unreadable data. */
      }
      const revision = Number.isInteger(priorRevision) ? priorRevision + 1 : 1;
      const restored = { ...incoming, revision };
      storage.setItem(TRACKER_KEY, JSON.stringify(restored));
      return restored;
    },
  };
}
