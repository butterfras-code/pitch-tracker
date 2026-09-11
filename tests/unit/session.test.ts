import { describe, expect, it } from 'vitest';
import { parseBackup } from '../../src/domain/backup';
import { activeSession, nextStudent } from '../../src/domain/session';
import {
  changeClass,
  createSession,
  finishSession,
  recordAttempt,
  remember,
  resumeSession,
  setAttendance,
  undo,
  type SessionState,
} from '../../src/domain/session-changes';
import { trackerFixture } from '../fixtures/tracker';

function state(): SessionState {
  return { db: trackerFixture(), undoStack: [] };
}
describe('session transitions', () => {
  it('creates a roster snapshot and preserves it through finish/resume', () => {
    const s = state();
    finishSession(s, 3000);
    s.db.classes[0].students.push({
      id: 'archived',
      name: 'Archived',
      instrument: 'Flute',
      archived: true,
    });
    const created = createSession(s, ' Next rehearsal ', 4000, 'session-2')!;
    expect(created.name).toBe('Next rehearsal');
    expect(created.roster).toHaveLength(1);
    s.db.classes[0].students[0].name = 'Renamed';
    expect(created.roster[0].name).toBe('Maya');
    expect(resumeSession(s, 'session-1')).toBe(false);
    finishSession(s, 5000);
    expect(resumeSession(s, 'session-1')).toBe(true);
    expect(s.db.activeStudent).toBe('student-1');
    expect(s.undoStack).toEqual([]);
    expect(parseBackup(JSON.stringify(s.db))).toEqual(s.db);
  });
  it('records target snapshots, rejects absences and restores selection with undo', () => {
    const s = state();
    const previous = structuredClone(s.db.sessions[0]);
    const attempt = recordAttempt(
      s,
      'low',
      'student-1',
      { frequency: 420, cents: -80, status: 'low' },
      3000,
      'attempt-2',
    )!;
    s.db.configs.Flute.min = -100;
    expect(attempt.target.min).toBe(-25);
    expect(attempt).toMatchObject({
      name: 'Maya',
      a4: 440,
      source: 'microphone',
      frequency: 420,
      cents: -80,
    });
    setAttendance(s, 'student-1', true);
    expect(s.db.activeStudent).toBeNull();
    expect(recordAttempt(s, 'correct', 'student-1')).toBeNull();
    expect(undo(s)).toBe(true);
    expect(s.db.activeStudent).toBe('student-1');
    expect(undo(s)).toBe(true);
    expect(s.db.sessions[0]).toEqual(previous);
  });
  it('uses replacement data and replacement session objects after restore and undo', () => {
    const s = state(),
      old = s.db;
    s.db = parseBackup(JSON.stringify(s.db));
    recordAttempt(s, 'high', 'student-1', null, 3000, 'attempt-2');
    expect(old.sessions[0].attempts).toHaveLength(1);
    const beforeUndo = activeSession(s.db)!;
    undo(s);
    recordAttempt(s, 'low', 'student-1', null, 4000, 'attempt-3');
    expect(beforeUndo.attempts.at(-1)?.id).toBe('attempt-2');
    expect(activeSession(s.db)?.attempts.at(-1)?.id).toBe('attempt-3');
  });
  it('prioritizes fewest attempts, excludes absences and avoids repeating tied students', () => {
    const s = state(),
      session = s.db.sessions[0];
    session.roster.push(
      { id: 'student-2', name: 'Sam', instrument: 'Flute', archived: false },
      { id: 'student-3', name: 'Lee', instrument: 'Flute', archived: false },
    );
    expect(nextStudent(s.db)).toBe('student-2');
    expect(nextStudent(s.db, () => 0.99)).toBe('student-3');
    s.db.activeStudent = 'student-2';
    expect(nextStudent(s.db)).toBe('student-3');
    setAttendance(s, 'student-3', true);
    expect(nextStudent(s.db)).toBe('student-2');
    setAttendance(s, 'student-2', true);
    expect(nextStudent(s.db)).toBe('student-1');
    setAttendance(s, 'student-1', true);
    expect(nextStudent(s.db)).toBeNull();
  });
  it('limits undo to 50 changes and resets it on class changes', () => {
    const s = state();
    for (let i = 0; i < 55; i++) {
      remember(s);
      s.db.sessions[0].note = String(i);
    }
    expect(s.undoStack).toHaveLength(50);
    for (let i = 0; i < 50; i++) expect(undo(s)).toBe(true);
    expect(s.db.sessions[0].note).toBe('4');
    expect(undo(s)).toBe(false);
    remember(s);
    expect(changeClass(s, 'class-1')).toBe(true);
    expect(s.undoStack).toEqual([]);
  });
  it('rejects invalid or duplicate session creation without modifying data', () => {
    const s = state(),
      before = structuredClone(s.db);
    expect(createSession(s, 'Duplicate')).toBeNull();
    expect(s.db).toEqual(before);
    finishSession(s, 3000);
    s.db.classes[0].students[0].archived = true;
    expect(createSession(s, 'Empty roster')).toBeNull();
    expect(s.db.activeSession).toBeNull();
  });
});

it('undo restores temporary round membership and completion without changing v1 data', () => {
  const s = state();
  s.roundQueue = {
    sessionId: s.db.activeSession!,
    kind: 'retry',
    ids: ['student-1'],
    baseline: s.db.sessions[0].attempts.map((a) => a.id),
    skipped: [],
  };
  s.roundComplete = false;
  s.lastClassroomResult = 'Previous result';
  const original = structuredClone(s.db);
  remember(s);
  s.roundQueue.ids.push('extra');
  s.roundQueue.skipped.push('student-1');
  s.roundComplete = true;
  s.lastClassroomResult = 'Changed';
  expect(undo(s)).toBe(true);
  expect(s.roundQueue.ids).toEqual(['student-1']);
  expect(s.roundQueue.skipped).toEqual([]);
  expect(s.roundComplete).toBe(false);
  expect(s.lastClassroomResult).toBe('Previous result');
  expect(s.db).toEqual(original);
  expect(parseBackup(JSON.stringify(s.db))).toEqual(original);
});
