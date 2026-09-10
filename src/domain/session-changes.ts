/** In-memory transitions. Callers own persistence, confirmation, audio, and rendering. */
import { clone, uid } from './identity';
import type { PitchMeasurement, PitchStatus } from './pitch';
import { activeSession, presentStudents } from './session';
import type { Attempt, Session, TrackerData } from './tracker';
export interface SessionState {
  db: TrackerData;
  undoStack: { id: string; data: Session; active: string | null }[];
}
export function remember(state: SessionState): void {
  const s = activeSession(state.db);
  if (!s) return;
  state.undoStack.push({
    id: s.id,
    data: clone(s),
    active: state.db.activeStudent,
  });
  if (state.undoStack.length > 50) state.undoStack.shift();
}
export function undo(state: SessionState): boolean {
  const u = state.undoStack.pop();
  if (!u || u.id !== state.db.activeSession) return false;
  state.db.sessions[state.db.sessions.findIndex((s) => s.id === u.id)] = u.data;
  state.db.activeStudent = u.active;
  return true;
}
export function changeClass(state: SessionState, id: string): boolean {
  const db = state.db;
  if (!db.classes.some((c) => c.id === id)) return false;
  db.classId = id;
  db.activeSession =
    db.sessions.find((s) => s.classId === id && !s.ended)?.id ?? null;
  db.activeStudent = presentStudents(activeSession(db))[0]?.id ?? null;
  state.undoStack = [];
  return true;
}
export function createSession(
  state: SessionState,
  name: string,
  now = Date.now(),
  id = uid(),
): Session | null {
  const db = state.db,
    cls = db.classes.find((c) => c.id === db.classId);
  if (!cls || !name.trim() || activeSession(db)) return null;
  const roster = clone(cls.students.filter((p) => !p.archived));
  if (!roster.length) return null;
  const s: Session = {
    id,
    classId: cls.id,
    className: cls.name,
    name: name.trim(),
    started: now,
    ended: null,
    roster,
    absent: [],
    attempts: [],
    notes: {},
    note: '',
  };
  db.sessions.push(s);
  db.activeSession = s.id;
  db.activeStudent = roster[0]?.id ?? null;
  state.undoStack = [];
  return s;
}
export function finishSession(state: SessionState, now = Date.now()): boolean {
  const s = activeSession(state.db);
  if (!s) return false;
  s.ended = now;
  state.db.activeSession = null;
  state.db.activeStudent = null;
  state.undoStack = [];
  return true;
}
export function resumeSession(state: SessionState, id: string): boolean {
  const db = state.db,
    s = db.sessions.find((s) => s.id === id && s.classId === db.classId);
  if (
    !s ||
    db.sessions.some(
      (other) =>
        other.classId === db.classId && !other.ended && other.id !== id,
    )
  )
    return false;
  s.ended = null;
  db.activeSession = id;
  db.activeStudent = presentStudents(s)[0]?.id ?? null;
  state.undoStack = [];
  return true;
}
export function setAttendance(
  state: SessionState,
  id: string,
  absent: boolean,
): boolean {
  const s = activeSession(state.db);
  if (!s || !s.roster.some((p) => p.id === id)) return false;
  remember(state);
  s.absent = s.absent.filter((x) => x !== id);
  if (absent) s.absent.push(id);
  if (absent && state.db.activeStudent === id)
    state.db.activeStudent = presentStudents(s)[0]?.id ?? null;
  return true;
}
export function recordAttempt(
  state: SessionState,
  status: PitchStatus,
  id: string | null,
  measurement: PitchMeasurement | null = null,
  now = Date.now(),
  attemptId = uid(),
): Attempt | null {
  const db = state.db,
    s = activeSession(db),
    p = s?.roster.find((p) => p.id === id);
  if (!s || !p || !id || s.absent.includes(id)) return null;
  remember(state);
  const attempt: Attempt = {
    id: attemptId,
    studentId: id,
    name: p.name,
    instrument: p.instrument,
    time: now,
    status,
    source: measurement ? 'microphone' : 'manual',
    frequency: measurement?.frequency ?? null,
    cents: measurement?.cents ?? null,
    target: clone(db.configs[p.instrument]),
    a4: db.settings.a4,
  };
  s.attempts.push(attempt);
  db.activeStudent = id;
  return attempt;
}
