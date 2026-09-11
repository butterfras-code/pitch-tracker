/** Coordinates raw pitch evidence, display smoothing, and current-session recording. */
import { findElement } from '../ui/helpers';
import type { App } from '../app/application';
import { detectPitch, evaluate } from '../domain/pitch';
import { $, noteNames, statusName } from '../ui/helpers';

export const detection = {
  audioLoop(this: App, now: number): void {
    if (!this.mic || !this.analyser || !this.ctx) return;
    const pupil = this.pupil();
    this.raf = requestAnimationFrame((now) => this.audioLoop(now));
    if (now - this.lastAnalysis < 70) return;
    this.lastAnalysis = now;
    if (
      now < this.muteUntil ||
      this.tab !== 'session' ||
      document.hidden ||
      $('modal').open ||
      this.classroomPaused ||
      !pupil ||
      this.ses()?.absent.includes(pupil.id)
    ) {
      this.cancelCheck();
      return;
    }
    this.analyser.getFloatTimeDomainData(this.buffer);
    const freq = detectPitch(
      this.buffer,
      this.ctx.sampleRate,
      this.db.settings.gate,
    );
    const rms = Math.sqrt(
      this.buffer.reduce((sum, x) => sum + x * x, 0) / this.buffer.length,
    );
    const level = document.getElementById('inputLevel');
    if (level instanceof HTMLMeterElement) level.value = rms;
    const hint = findElement('inputHint');
    if (hint)
      hint.textContent =
        rms < this.db.settings.gate
          ? 'No signal'
          : freq
            ? 'Tone detected'
            : 'Sound detected - no reliable pitch';
    const listening = this.classroomListener.frame(
      now,
      rms,
      freq,
      this.db.settings.gate,
      this.clapNavigation && !this.pitchHold.active,
    );
    this.classroomListenerReady = listening.ready;
    if (listening.command) {
      this.classroomNavigate(listening.command === 'next' ? 1 : -1);
      return;
    }
    if (this.roundComplete) return;
    if (
      !this.checking &&
      listening.ready &&
      this.db.activeStudent &&
      this.ses()
    ) {
      this.checking = { id: this.db.activeStudent, sid: this.ses()!.id };
      this.checkDeadline = Infinity;
    }
    const status = findElement('classroomStatus');
    if (status && status.textContent !== this.classroomStatus())
      status.textContent = this.classroomStatus();
    if (this.checking && now > this.checkDeadline) {
      this.cancelCheck();
      this.toast(
        'No stable hold detected in 20 seconds. Try again or record manually.',
      );
      this.render();
    }
    let completed = null;
    if (this.checking) {
      if (
        this.checking.sid !== this.ses()?.id ||
        this.checking.id !== this.db.activeStudent
      ) {
        this.cancelCheck();
        return;
      }
      const hold = this.pitchHold.frame(
        now,
        freq,
        this.db.configs[pupil.instrument],
        this.db.settings.a4,
        this.db.settings.hold,
        this.db.settings.stability,
      );
      completed = hold.result;
      if (findElement('holdProgress'))
        $('holdProgress').style.width = hold.progress * 100 + '%';
    }
    const displayFrequency = this.pitchDisplay.frame(now, freq);
    if (!displayFrequency) {
      if (findElement('liveNote')) {
        $('liveNote').textContent = '—';
        $('liveHz').textContent = 'Listening for a clear tone';
        $('liveCents').textContent = 'No reliable pitch';
        $('needle').style.left = '50%';
      }
    } else if (findElement('liveNote')) {
      const midi = Math.round(
        69 + 12 * Math.log2(displayFrequency / this.db.settings.a4),
      );
      $('liveNote').textContent =
        noteNames[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
      $('liveHz').textContent = displayFrequency.toFixed(1) + ' Hz';
      if (pupil) {
        const result = evaluate(
          displayFrequency,
          this.db.configs[pupil.instrument],
          this.db.settings.a4,
        );
        $('liveCents').textContent =
          (result.cents >= 0 ? '+' : '') +
          Math.round(result.cents) +
          ' cents · ' +
          statusName(result.status);
        $('needle').style.left =
          Math.max(0, Math.min(100, 50 + result.cents / 4)) + '%';
      }
    }
    if (completed && this.checking)
      this.record(completed.status, this.checking.id, completed);
  },
};
