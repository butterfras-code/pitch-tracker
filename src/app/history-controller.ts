/** Resumes sessions and applies history corrections without discarding measurements. */
import { isPitchStatus } from '../domain/pitch';
import { resumeSession } from '../domain/session-changes';
import { $ } from '../ui/helpers';
import type { App } from './application';
export const historyController = {
  resumeSession(this: App, id: string): void {
    if (!resumeSession(this, id)) {
      this.toast('Finish the current session before resuming another.');
      return;
    }
    this.stopMic();
    this.resetRound();
    this.applySessionDefaults();
    this.save();
    this.tab = 'session';
    this.render();
  },
  deleteSession(this: App, id: string): void {
    if (
      !confirm(
        'Delete this session and all its attempts? Export a backup first if you may need them.',
      )
    )
      return;
    this.stopMic();
    this.db.sessions = this.db.sessions.filter((s) => s.id !== id);
    if (this.db.activeSession === id) {
      this.db.activeSession = null;
      this.db.activeStudent = null;
    }
    this.undoStack = [];
    this.save();
    this.render();
  },
  applyAttemptEdit(this: App, sid: string, id: string): void {
    if (sid === this.ses()?.id) this.remember();
    const a = this.db.sessions
      .find((s) => s.id === sid)
      ?.attempts.find((a) => a.id === id);
    if (!a) return;
    const status = $('editResult').value;
    if (!isPitchStatus(status)) return;
    a.originalStatus ??= a.status;
    a.status = status;
    a.source = 'corrected';
    this.save();
    this.closeDialog();
    this.render();
  },
  removeAttempt(this: App, sid: string, id: string): void {
    if (!confirm('Delete this attempt?')) return;
    if (sid === this.ses()?.id) this.remember();
    const s = this.db.sessions.find((s) => s.id === sid);
    if (!s) return;
    s.attempts = s.attempts.filter((a) => a.id !== id);
    this.save();
    this.closeDialog();
    this.render();
  },
};
