/** Queries the current application data, including after restore or undo. */
import {
  activeSession,
  presentStudents,
  studentAttempts,
} from '../domain/session';
import type { App } from './application';
import { esc } from '../ui/helpers';
import type {
  Attempt,
  Session,
  Student,
  TrackerClass,
} from '../domain/tracker';
export const selectors = {
  cls(this: App): TrackerClass {
    const selected = this.db.classes.find((c) => c.id === this.db.classId);
    if (!selected) throw new Error('Selected class is missing.');
    return selected;
  },
  ses(this: App): Session | undefined {
    return activeSession(this.db);
  },
  pupil(this: App): Student | undefined {
    return this.ses()?.roster.find((s) => s.id === this.db.activeStudent);
  },
  present(this: App): Student[] {
    return presentStudents(this.ses());
  },
  attempts(this: App, id?: string, s = this.ses()): Attempt[] {
    return studentAttempts(s, id);
  },
  classOptions(this: App): string {
    return this.db.classes
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === this.db.classId ? 'selected' : ''}>${esc(c.name)}</option>`,
      )
      .join('');
  },
};
