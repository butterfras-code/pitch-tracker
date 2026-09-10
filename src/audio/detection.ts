/** Runs pitch analysis and steady-hold recording against current session state. */
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
    const gap = now - this.lastFrame;
    this.lastFrame = now;
    if (now < this.muteUntil) {
      this.holdSamples = [];
      this.holdStart = null;
      return;
    }
    this.analyser.getFloatTimeDomainData(this.buffer);
    const freq = detectPitch(
      this.buffer,
      this.ctx.sampleRate,
      this.db.settings.gate,
    );
    if (this.checking && now > this.checkDeadline) {
      this.cancelCheck();
      this.toast(
        'No stable hold detected in 20 seconds. Try again or record manually.',
      );
      this.render();
    }
    if (!freq) {
      this.holdSamples = [];
      this.holdStart = null;
      if (findElement('liveNote')) {
        $('liveNote').textContent = '—';
        $('liveHz').textContent = 'Listening for a clear tone';
        $('liveCents').textContent = 'No reliable pitch';
        $('holdProgress').style.width = '0%';
        $('needle').style.left = '50%';
      }
      return;
    }
    const midi = Math.round(69 + 12 * Math.log2(freq / this.db.settings.a4));
    if (findElement('liveNote')) {
      $('liveNote').textContent =
        noteNames[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
      $('liveHz').textContent = freq.toFixed(1) + ' Hz';
      if (pupil) {
        const result = evaluate(
          freq,
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
    if (this.checking) {
      if (
        this.checking.sid !== this.ses()?.id ||
        this.checking.id !== this.db.activeStudent ||
        !pupil
      ) {
        this.cancelCheck();
        return;
      }
      if (gap > 250) {
        this.holdSamples = [];
        this.holdStart = null;
      }
      const cents = 1200 * Math.log2(freq),
        lo = this.holdSamples.length ? Math.min(...this.holdSamples) : cents,
        hi = this.holdSamples.length ? Math.max(...this.holdSamples) : cents;
      if (
        Math.max(hi, cents) - Math.min(lo, cents) >
        this.db.settings.stability
      ) {
        this.holdSamples = [];
        this.holdStart = null;
      }
      if (this.holdStart === null) this.holdStart = now;
      this.holdSamples.push(cents);
      const duration = (now - this.holdStart) / 1000;
      if (findElement('holdProgress'))
        $('holdProgress').style.width =
          Math.min(100, (duration / this.db.settings.hold) * 100) + '%';
      if (duration >= this.db.settings.hold) {
        const sorted = this.holdSamples.slice().sort((a, b) => a - b),
          median = sorted[Math.floor(sorted.length / 2)],
          id = this.checking.id,
          result = evaluate(
            2 ** (median / 1200),
            this.db.configs[pupil.instrument],
            this.db.settings.a4,
          );
        this.record(result.status, id, result);
      }
    }
  },
};
