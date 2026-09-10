import type { TrackerData } from '../../src/domain/tracker';

export function trackerFixture(): TrackerData {
  const student = {
    id: 'student-1',
    name: 'Maya',
    instrument: 'Flute',
    archived: false,
  };
  return {
    schema: 1,
    classes: [{ id: 'class-1', name: 'Band', students: [student] }],
    configs: { Flute: { pitch: 'A4', min: -25, max: 25 } },
    settings: { a4: 440, hold: 2, stability: 35, gate: 0.015, advance: false },
    sessions: [
      {
        id: 'session-1',
        classId: 'class-1',
        className: 'Band',
        name: 'Rehearsal',
        started: 1000,
        ended: null,
        roster: [{ ...student }],
        absent: [],
        notes: { 'student-1': 'Steady tone' },
        note: 'Warm-up',
        attempts: [
          {
            id: 'attempt-1',
            studentId: 'student-1',
            name: 'Maya',
            instrument: 'Flute',
            time: 2000,
            status: 'correct',
            source: 'microphone',
            frequency: 440,
            cents: 0,
            target: { pitch: 'A4', min: -25, max: 25 },
            a4: 440,
          },
        ],
      },
    ],
    classId: 'class-1',
    activeSession: 'session-1',
    activeStudent: 'student-1',
    revision: 4,
    lastBackup: null,
  };
}
