import { describe, expect, it } from 'vitest';
import {
  createRound,
  roundSummary,
  retryIds,
  roundState,
} from '../../src/domain/round';
import { trackerFixture } from '../fixtures/tracker';

describe('round queues', () => {
  it('retries latest incorrect results only, excluding absent and untested students', () => {
    const s = trackerFixture().sessions[0];
    s.roster.push({ ...s.roster[0], id: 'b' }, { ...s.roster[0], id: 'c' });
    s.attempts.push({
      ...s.attempts[0],
      id: 'a2',
      studentId: 'b',
      status: 'low',
    });
    expect(retryIds(s)).toEqual(['b']);
    expect(roundState(s, createRound(s, 'retry'), 'student-1')).toBe(
      'Not in this round',
    );
    s.absent.push('b');
    expect(retryIds(s)).toEqual([]);
    s.absent = [];
    s.attempts.push({
      ...s.attempts[0],
      id: 'a3',
      studentId: 'b',
      status: 'correct',
    });
    expect(retryIds(s)).toEqual([]);
  });
  it('distinguishes this round from previous attempts, skips and incorrect completion', () => {
    const s = trackerFixture().sessions[0];
    const r = createRound(s, 'whole');
    expect(roundState(s, r, 'student-1')).toBe('Not yet tried');
    r.skipped.push('student-1');
    expect(roundState(s, r, 'student-1')).toBe('Skipped this round');
    s.attempts.push({ ...s.attempts[0], id: 'new', status: 'high' });
    expect(roundState(s, r, 'student-1')).toBe('Needs another try');
    expect(roundSummary(s, r)).toEqual({
      attempted: 1,
      correct: 0,
      needsPractice: 1,
      unplayed: 0,
    });
  });
  it('empty rounds have no eligible students', () => {
    const s = trackerFixture().sessions[0];
    s.absent = ['student-1'];
    expect(createRound(s, 'whole').ids).toEqual([]);
  });
});
