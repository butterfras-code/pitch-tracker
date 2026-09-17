import type { App } from './application';
import type { PitchMeasurement, PitchStatus } from '../domain/pitch';
import {
  nextStreak,
  tunerTranspositions,
  type TunerTransposition,
} from '../domain/tuner';

const resultText: Record<PitchStatus, string> = {
  low: 'Too low · streak reset',
  correct: 'In range',
  high: 'Too high · streak reset',
};

export const tunerController = {
  setTunerTransposition(this: App, value: string): void {
    if (!tunerTranspositions.some((item) => item.id === value)) return;
    this.tunerTransposition = value as TunerTransposition;
    this.resetTunerAttempt(true);
    this.render();
  },
  setTunerTargetPart(this: App, part: 'note' | 'octave', value: string): void {
    const match = /^([A-G](?:#|b)?)([0-8])$/.exec(this.tunerTargetPitch);
    if (!match) return;
    const pitch = part === 'note' ? value + match[2] : match[1] + value;
    if (!/^[A-G](?:#|b)?[0-8]$/.test(pitch)) return;
    this.tunerTargetPitch = pitch;
    this.resetTunerAttempt(true);
    this.render();
  },
  setTunerTargetLocked(this: App, locked: boolean): void {
    if (this.tunerTargetLocked === locked) return;
    this.tunerTargetLocked = locked;
    this.resetTunerAttempt(true);
    this.render();
  },
  resetTunerAttempt(this: App, resetStreak = false): void {
    this.cancelCheck();
    this.tunerAwaitingRelease = false;
    this.tunerReleaseSince = null;
    this.tunerLastStatus = '';
    if (resetStreak) this.tunerStreak = 0;
  },
  completeTunerAttempt(this: App, measurement: PitchMeasurement): void {
    this.tunerLastStatus = measurement.status;
    this.tunerStreak = nextStreak(this.tunerStreak, measurement.status);
    this.tunerAwaitingRelease = true;
    this.tunerReleaseSince = null;
    this.pitchHold.reset();
    const shell = document.getElementById('sessionShell');
    if (shell) shell.dataset.range = measurement.status;
    const streak = document.getElementById('tunerStreak');
    if (streak) streak.textContent = String(this.tunerStreak);
    const result = document.getElementById('tunerResult');
    if (result) result.textContent = this.tunerResultText();
    document
      .querySelectorAll<HTMLElement>('.tuner-feedback [data-status]')
      .forEach((indicator) =>
        indicator.setAttribute(
          'aria-current',
          String(indicator.dataset.status === measurement.status),
        ),
      );
    const reset = document.querySelector<HTMLButtonElement>(
      '[data-ui-click="reset-tuner-streak"]',
    );
    if (reset) reset.disabled = !this.tunerStreak;
  },
  resetTunerStreak(this: App): void {
    this.resetTunerAttempt(true);
    this.render();
  },
  tunerResultText(this: App): string {
    if (!this.tunerLastStatus)
      return this.tunerTargetLocked
        ? 'Hold the target note to begin a streak.'
        : 'Hold any steady note to begin a streak.';
    return this.tunerLastStatus === 'correct'
      ? `${resultText.correct} · ${this.tunerStreak} ${this.tunerStreak === 1 ? 'note' : 'notes'} in a row`
      : resultText[this.tunerLastStatus];
  },
  tunerStatus(this: App): string {
    return this.classroomPaused
      ? 'Paused'
      : !this.mic
        ? 'Microphone off'
        : this.tunerAwaitingRelease
          ? 'Release the note before the next attempt'
          : this.pitchHold.active
            ? 'Keep holding'
            : this.tunerTargetLocked
              ? 'Play the target note'
              : 'Play a steady note';
  },
  async toggleTunerFullscreen(this: App): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      this.toast('Full screen is unavailable in this browser.');
    }
    const button = document.querySelector<HTMLElement>(
      '[data-ui-click="tuner-fullscreen"]',
    );
    if (button) {
      const fullscreen = !!document.fullscreenElement;
      button.setAttribute(
        'aria-label',
        fullscreen ? 'Exit full screen' : 'Full screen',
      );
      button.setAttribute('aria-pressed', String(fullscreen));
    }
  },
};
