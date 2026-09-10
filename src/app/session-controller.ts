/** Coordinates session rules with saving, audio cancellation, and the UI. */
import { $, statusName } from '../ui/helpers';
import type { App } from './application';
import type { PitchMeasurement, PitchStatus } from '../domain/pitch';
import { nextStudent } from '../domain/session';
import * as changes from '../domain/session-changes';
export const sessionController = {
  switchTab(this: App, tab: string): void {
    this.cancelCheck();
    this.tab = tab;
    this.render();
  },
  selectStudent(this: App, id: string): void {
    if (!this.ses()?.roster.some((p) => p.id === id)) return;
    this.cancelCheck();
    this.db.activeStudent = id;
    this.save();
    this.render();
  },
  changeClass(this: App, id: string): void {
    this.stopMic();
    if (!changes.changeClass(this, id)) return;
    this.save();
    this.render();
  },
  createSession(this: App): void {
    if (!changes.createSession(this, $('sessionName').value)) return;
    this.save();
    this.closeDialog();
    this.render();
  },
  endSession(this: App): void {
    if (
      !this.ses() ||
      !confirm(
        'Finish this session and save it to history? You can resume it later.',
      )
    )
      return;
    this.stopMic();
    changes.finishSession(this);
    this.save();
    this.tab = 'history';
    this.render();
  },
  remember(this: App): void {
    changes.remember(this);
  },
  undo(this: App): void {
    if (!changes.undo(this)) return;
    this.cancelCheck();
    this.save();
    this.render();
    this.toast('Last change undone.');
  },
  attendance(this: App, id: string, absent: boolean): void {
    this.cancelCheck();
    if (!changes.setAttendance(this, id, absent)) return;
    this.save();
    this.render();
  },
  pickNext(this: App, random: boolean): void {
    const id = nextStudent(this.db, random ? Math.random : undefined);
    if (!id) {
      this.toast('No students marked present.');
      return;
    }
    this.selectStudent(id);
  },
  record(
    this: App,
    status: PitchStatus,
    id: string | null = this.db.activeStudent,
    measurement: PitchMeasurement | null = null,
  ): void {
    const s = this.ses();
    if (!id || !s?.roster.some((p) => p.id === id) || s.absent.includes(id))
      return;
    this.cancelCheck();
    const attempt = changes.recordAttempt(this, status, id, measurement);
    if (!attempt) return;
    this.save();
    if (this.db.settings.advance) this.pickNext(false);
    else this.render();
    this.toast(attempt.name + ' · ' + statusName(status));
  },
};
