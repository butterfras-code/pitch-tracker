import type { Attempt, Session, TrackerClass } from './tracker';

function summarize(attempts: Attempt[], rosterIds: Set<string>) {
  const correct = attempts.filter((a) => a.status === 'correct').length;
  return {
    correct,
    percent: attempts.length
      ? Math.round((correct / attempts.length) * 100)
      : null,
    checked: new Set(attempts.map((a) => a.studentId)).size,
    students: rosterIds.size,
  };
}

/** Historical coverage retains students removed from the current roster. */
export function classResults(cls: TrackerClass, sessions: Session[]) {
  const history = sessions.filter((s) => s.classId === cls.id);
  const latest = history.reduce<Session | null>(
    (last, s) => (!last || s.started > last.started ? s : last),
    null,
  );
  const attempts = history.flatMap((s) => s.attempts);
  const students = cls.students.filter((p) => !p.archived).length;
  const allIds = new Set([
    ...cls.students.filter((p) => !p.archived).map((p) => p.id),
    ...history.flatMap((s) => s.roster.map((p) => p.id)),
  ]);
  return {
    students,
    latest,
    ongoing: history.find((s) => s.ended === null) ?? null,
    allTime: summarize(attempts, allIds),
    lastSession: latest
      ? summarize(latest.attempts, new Set(latest.roster.map((p) => p.id)))
      : null,
  };
}
