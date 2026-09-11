import { describe, expect, it } from 'vitest';
import { classResults } from '../../src/domain/class-results';
import { trackerFixture } from '../fixtures/tracker';

describe('class results', () => {
  it('weights attempts, deduplicates students and picks the newest session regardless of array order', () => {
    const db = trackerFixture();
    const first = db.sessions[0];
    const next = structuredClone(first);
    next.id = 'newer';
    next.started = 5000;
    next.ended = 6000;
    first.ended = 3000;
    next.attempts = [
      { ...first.attempts[0], status: 'low' },
      { ...first.attempts[0], status: 'high' },
      { ...first.attempts[0], status: 'correct' },
    ];
    const foreign = { ...first, classId: 'other' };
    const result = classResults(db.classes[0], [next, foreign, first]);
    expect(result.allTime).toEqual({
      correct: 2,
      percent: 50,
      checked: 1,
      students: 1,
    });
    expect(result.lastSession).toEqual({
      correct: 1,
      percent: 33,
      checked: 1,
      students: 1,
    });
    expect(result.latest?.id).toBe('newer');
    expect(result.ongoing).toBeNull();
  });

  it('retains historical students and absent students without changing current enrollment', () => {
    const db = trackerFixture();
    const cls = db.classes[0];
    const s = db.sessions[0];
    cls.students = [{ ...cls.students[0], id: 'new-student' }];
    s.roster.push({ ...s.roster[0], id: 'absent-student' });
    s.absent = ['absent-student'];
    const result = classResults(cls, db.sessions);
    expect(result.students).toBe(1);
    expect(result.allTime).toMatchObject({ checked: 1, students: 3 });
    expect(result.lastSession).toMatchObject({ checked: 1, students: 2 });
    expect(result.ongoing?.id).toBe(s.id);
  });

  it('distinguishes no sessions, no attempts and a genuine zero percent', () => {
    const db = trackerFixture();
    db.classes[0].students[0].archived = true;
    const empty = classResults(db.classes[0], []);
    expect(empty.students).toBe(0);
    expect(empty.allTime).toEqual({
      correct: 0,
      percent: null,
      checked: 0,
      students: 0,
    });
    expect(empty.lastSession).toBeNull();
    db.sessions[0].attempts[0].status = 'low';
    expect(classResults(db.classes[0], db.sessions).lastSession?.percent).toBe(
      0,
    );
    db.sessions[0].attempts = [];
    expect(classResults(db.classes[0], db.sessions).lastSession).toEqual({
      correct: 0,
      percent: null,
      checked: 0,
      students: 1,
    });
  });
});
