import type { App } from './application';
import { createRound } from '../domain/round';
import { adjacentStudent } from '../domain/classroom';
import { SessionView } from '../ui/classroom-view';
import { $ } from '../ui/helpers';
export const classroomController = {
  ensureRound(this: App): void {
    const s = this.ses();
    if (!s) return;
    if (!this.roundQueue || this.roundQueue.sessionId !== s.id) {
      this.roundQueue = createRound(s, 'whole');
      this.roundComplete = false;
    }
    if (this.roundQueue.kind === 'whole') {
      const presentIds = this.present().map((p) => p.id);
      this.roundQueue.ids = [
        ...this.roundQueue.ids.filter((id) => presentIds.includes(id)),
        ...presentIds.filter((id) => !this.roundQueue!.ids.includes(id)),
      ];
    }
  },
  shuffleStudents(this: App): void {
    this.ensureRound();
    if (!this.roundQueue || this.roundQueue.ids.length < 2) return;
    this.remember();
    for (let i = this.roundQueue.ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.roundQueue.ids[i], this.roundQueue.ids[j]] = [
        this.roundQueue.ids[j],
        this.roundQueue.ids[i],
      ];
    }
    this.render();
    this.toast('Student order shuffled.');
  },
  resetRound(this: App): void {
    this.pitchFeedback.clear();
    this.roundQueue = null;
    this.roundComplete = false;
    this.lastClassroomResult = '';
  },
  renderClassroom(this: App): void {
    this.ensureRound();
    const s = this.ses();
    if (!s || !this.roundQueue) return;
    this.workspace ??= new SessionView(
      this.db.schema === 3 ? this.db.sessionDefaults : undefined,
    );
    this.workspace.render($('main'), {
      s,
      db: this.db,
      round: this.roundQueue,
      paused: this.classroomPaused,
      mic: this.mic,
      complete: this.roundComplete,
      status: this.classroomStatus(),
      result: this.lastClassroomResult,
      mode: this.classroomMode,
      claps: this.clapNavigation,
      undo: !!this.undoStack.length,
      search: this.search,
      filter: this.filter,
      devices: this.microphoneDevices,
      deviceId: this.microphoneId,
      micError: this.microphoneError,
    });
  },
  classroomNavigate(this: App, direction: 1 | -1, manual = true): void {
    this.ensureRound();
    const s = this.ses(),
      r = this.roundQueue;
    if (!s || !r) return;
    const ids = r.ids.filter((id) => this.present().some((p) => p.id === id));
    const id = adjacentStudent(ids, this.db.activeStudent ?? '', direction);
    if (manual) {
      this.remember();
      const active = this.db.activeStudent;
      if (
        direction === 1 &&
        active &&
        !s.attempts.some(
          (a) => a.studentId === active && !r.baseline.includes(a.id),
        ) &&
        !r.skipped.includes(active)
      )
        r.skipped.push(active);
    }
    if (id) {
      this.selectStudent(id, false);
      if (manual)
        this.toast(
          (direction === 1 ? 'Skipped to ' : 'Back to ') + this.pupil()?.name,
        );
    } else {
      this.cancelCheck();
      this.roundComplete = true;
      this.render();
    }
  },
  startRound(this: App, kind: 'whole' | 'retry'): void {
    this.pitchFeedback.clear();
    const s = this.ses();
    if (!s) return;
    const next = createRound(s, kind);
    if (!next.ids.length) {
      this.toast('No students available for this round.');
      return;
    }
    this.remember();
    this.roundQueue = next;
    this.roundComplete = false;
    this.lastClassroomResult = '';
    this.selectStudent(next.ids[0], false);
  },
  classroomStatus(this: App): string {
    return this.roundComplete
      ? 'Round complete'
      : this.classroomPaused
        ? 'Paused'
        : !this.mic
          ? 'Microphone off'
          : !this.pupil()
            ? 'No present students'
            : this.pitchHold.active
              ? 'Keep holding'
              : this.classroomListenerReady
                ? 'Your turn - play'
                : 'Waiting for a pause';
  },
  toggleClassroomPause(this: App): void {
    this.classroomPaused = !this.classroomPaused;
    this.cancelCheck();
    this.render();
  },
};
