export type AdvanceMode = 'until-correct' | 'one-and-done';
export function shouldAdvance(
  enabled: boolean,
  mode: AdvanceMode,
  status: string,
): boolean {
  return enabled && (mode === 'one-and-done' || status === 'correct');
}
export function adjacentStudent(
  ids: string[],
  current: string,
  direction: 1 | -1,
): string | null {
  const index = ids.indexOf(current);
  return ids[Math.max(0, index + direction)] ?? null;
}

/** Audio observations and monotonic milliseconds only; no device or UI dependencies. */
export class ClassroomListener {
  private quietSince: number | null = null;
  private lastTime: number | null = null;
  private armed = false;
  private pulseStart: number | null = null;
  private pulsePitched = false;
  private claps = 0;
  private lastClap = 0;
  private background: { time: number; rms: number }[] = [];

  reset(): void {
    this.quietSince = this.lastTime = this.pulseStart = null;
    this.armed = false;
    this.claps = 0;
    this.pulsePitched = false;
    this.background = [];
  }

  frame(
    now: number,
    rms: number,
    frequency: number | null,
    gate: number,
    clapEnabled: boolean,
  ): { ready: boolean; command: 'next' | 'previous' | null } {
    let command: 'next' | 'previous' | null = null;
    const gap = this.lastTime !== null && now - this.lastTime > 250;
    this.lastTime = now;
    if (gap) {
      this.quietSince = null;
      this.background = [];
    }
    if (!clapEnabled) {
      this.claps = 0;
      this.pulseStart = null;
    }
    if (clapEnabled) {
      if (
        this.claps &&
        now - this.lastClap >= 500 &&
        this.pulseStart === null
      ) {
        command =
          this.claps === 2 ? 'next' : this.claps === 3 ? 'previous' : null;
        this.claps = 0;
      }
      const loud = rms >= Math.max(0.08, gate * 4);
      if (loud) {
        if (this.pulseStart === null) {
          this.pulseStart = now;
          this.pulsePitched = false;
        }
        this.pulsePitched ||= frequency !== null;
      } else if (this.pulseStart !== null) {
        const duration = now - this.pulseStart;
        if (
          duration <= 180 &&
          !this.pulsePitched &&
          (!this.claps || now - this.lastClap >= 180)
        ) {
          this.claps++;
          this.lastClap = now;
        } else {
          this.claps = 0;
        }
        this.pulseStart = null;
      }
    }
    if (rms < gate) {
      this.quietSince ??= now;
      if (now - this.quietSince >= 500) this.armed = true;
    } else this.quietSince = null;
    // A settled, unpitched background can separate turns without literal
    // silence. Never learn a detected sustained note as room noise. Abrupt
    // changes restart settling, so an impact is not a handoff by itself.
    if (frequency === null && rms >= gate && Number.isFinite(rms)) {
      if (
        this.background.some(
          (sample) =>
            Math.max(sample.rms, rms) > Math.min(sample.rms, rms) * 1.5,
        )
      )
        this.background = [];
      this.background.push({ time: now, rms });
      if (now - this.background[0].time >= 800) {
        this.armed = true;
        this.background.shift();
      }
    } else this.background = [];
    if (command) {
      this.reset();
      return { ready: false, command };
    }
    return {
      ready:
        this.armed &&
        !this.claps &&
        (this.pulseStart === null || this.pulsePitched),
      command,
    };
  }
}
