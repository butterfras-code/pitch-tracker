import type { Session } from './tracker';
export interface Round {
  sessionId: string;
  kind: 'whole' | 'retry';
  ids: string[];
  baseline: string[];
  skipped: string[];
}
export function retryIds(s: Session): string[] {
  return s.roster
    .filter(
      (p) =>
        !s.absent.includes(p.id) &&
        s.attempts.filter((a) => a.studentId === p.id).at(-1)?.status !==
          undefined &&
        s.attempts.filter((a) => a.studentId === p.id).at(-1)?.status !==
          'correct',
    )
    .map((p) => p.id);
}
export function createRound(s: Session, kind: Round['kind']): Round {
  return {
    sessionId: s.id,
    kind,
    ids:
      kind === 'retry'
        ? retryIds(s)
        : s.roster.filter((p) => !s.absent.includes(p.id)).map((p) => p.id),
    baseline: s.attempts.map((a) => a.id),
    skipped: [],
  };
}
export function roundState(s: Session, r: Round, id: string): string {
  if (s.absent.includes(id)) return 'Absent';
  if (!r.ids.includes(id)) return 'Not in this round';
  const last = s.attempts
    .filter((a) => a.studentId === id && !r.baseline.includes(a.id))
    .at(-1);
  if (last)
    return last.status === 'correct' ? 'Completed' : 'Needs another try';
  return r.skipped.includes(id) ? 'Skipped this round' : 'Not yet tried';
}
export function roundSummary(s: Session, r: Round) {
  const states = r.ids
    .filter((id) => !s.absent.includes(id))
    .map((id) => roundState(s, r, id));
  const correct = states.filter((x) => x === 'Completed').length,
    needsPractice = states.filter((x) => x === 'Needs another try').length;
  return {
    attempted: correct + needsPractice,
    correct,
    needsPractice,
    unplayed: states.length - correct - needsPractice,
  };
}
