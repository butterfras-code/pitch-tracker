/** Session queries and selection rules, independent of storage and the browser. */
import type { Session, TrackerData } from './tracker';
export const activeSession = (db: TrackerData) =>
  db.sessions.find((s) => s.id === db.activeSession);
export const presentStudents = (s: Session | undefined) =>
  s?.roster.filter((p) => !s.absent.includes(p.id)) ?? [];
export const studentAttempts = (s: Session | undefined, id?: string) =>
  s?.attempts.filter((a) => !id || a.studentId === id) ?? [];
export function nextStudent(
  db: TrackerData,
  random?: () => number,
): string | null {
  const s = activeSession(db),
    pool = presentStudents(s);
  if (!pool.length) return null;
  const min = Math.min(...pool.map((p) => studentAttempts(s, p.id).length));
  let candidates = pool.filter((p) => studentAttempts(s, p.id).length === min);
  if (candidates.length > 1)
    candidates = candidates.filter((p) => p.id !== db.activeStudent);
  return candidates[random ? Math.floor(random() * candidates.length) : 0].id;
}
