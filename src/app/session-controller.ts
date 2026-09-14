/** Coordinates session rules with saving, audio cancellation, and the UI. */
import { $ } from '../ui/helpers';
import type { App } from './application';
import type { PitchMeasurement, PitchStatus } from '../domain/pitch';
import { shouldAdvance } from '../domain/classroom';
import * as changes from '../domain/session-changes';
import { withFeedbackDuration } from '../domain/backup';
export const sessionController = {
  setFeedbackDuration(this: App, value: string): void {
    const duration = value.trim() === '' ? null : Number(value) * 1000;
    if (
      duration !== null &&
      (!Number.isInteger(duration) || duration < 500 || duration > 30000)
    )
      return;
    this.db = withFeedbackDuration(this.db, duration);
    this.save();
  },
  switchTab(this: App, tab: string): void {
    const settings = document.querySelector<HTMLFormElement>(
      '[data-ui-submit="settings"]',
    );
    if (
      this.tab === 'settings' &&
      tab !== 'settings' &&
      settings?.dataset.dirty === 'true' &&
      !confirm('Leave without saving your instrument changes?')
    )
      return;
    this.pitchFeedback.clear();
    this.cancelCheck();
    this.tab = tab;
    this.render();
    $('main').scrollTop = 0;
  },
  selectStudent(this: App, id: string, rememberSelection = true): void {
    if (!this.ses()?.roster.some((p) => p.id === id)) return;
    this.cancelCheck();
    if (rememberSelection && id !== this.db.activeStudent) this.remember();
    this.ensureRound();
    if (
      rememberSelection &&
      this.roundQueue &&
      !this.roundQueue.ids.includes(id) &&
      !this.ses()!.absent.includes(id)
    )
      this.roundQueue.ids.push(id);
    this.roundComplete = false;
    this.db.activeStudent = id;
    this.save();
    this.render();
  },
  changeClass(this: App, id: string): void {
    this.stopMic();
    if (!changes.changeClass(this, id)) return;
    this.resetRound();
    this.applySessionDefaults();
    this.save();
    this.render();
  },
  createSession(this: App): void {
    if (!changes.createSession(this)) return;
    this.tab = 'session';
    this.resetRound();
    this.classroomPaused = false;
    this.applySessionDefaults();
    this.save();
    this.closeDialog();
    this.render();
  },
  endSession(this: App): void {
    if (!this.ses()) return;
    this.stopMic();
    changes.finishSession(this);
    this.save();
    this.tab = 'history';
    this.render();
  },
  remember(this: App): void {
    this.ensureRound();
    changes.remember(this);
  },
  undo(this: App): void {
    if (!changes.undo(this)) return;
    this.pitchFeedback.clear();
    this.cancelCheck();
    this.save();
    this.render();
    this.toast('Last change undone.');
  },
  attendance(this: App, id: string, absent: boolean): void {
    this.cancelCheck();
    this.ensureRound();
    if (!changes.setAttendance(this, id, absent)) return;
    this.save();
    this.render();
  },
  pickNext(this: App, random: boolean): void {
    this.ensureRound();
    const pool = this.present().filter((p) =>
      this.roundQueue?.ids.includes(p.id),
    );
    const min = Math.min(...pool.map((p) => this.attempts(p.id).length));
    let candidates = pool.filter((p) => this.attempts(p.id).length === min);
    if (candidates.length > 1)
      candidates = candidates.filter((p) => p.id !== this.db.activeStudent);
    const id =
      candidates[random ? Math.floor(Math.random() * candidates.length) : 0]
        ?.id;
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
    this.ensureRound();
    const attempt = changes.recordAttempt(this, status, id, measurement);
    if (!attempt) return;
    this.save();
    if (this.roundQueue && !this.roundQueue.ids.includes(id))
      this.roundQueue.ids.push(id);
    this.lastClassroomResult =
      attempt.name +
      ': ' +
      (status === 'low'
        ? 'Try a little higher'
        : status === 'high'
          ? 'Try a little lower'
          : 'In range');
    if (shouldAdvance(this.db.settings.advance, this.classroomMode, status))
      this.classroomNavigate(1, false);
    else this.render();
    this.pitchFeedback.show(
      attempt.name,
      status,
      this.db.settings.feedbackDurationMs,
      this.workspace?.feedbackHost(id),
      this.mic && !this.classroomPaused && !this.roundComplete,
    );
  },
};
