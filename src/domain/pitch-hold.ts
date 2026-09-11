import { evaluate, type PitchMeasurement, type PitchTarget } from './pitch';

interface Observation {
  time: number;
  frequency: number;
  cents: number;
  status: PitchMeasurement['status'];
}
interface Interval extends Observation {
  start: number;
}

/** Recent measured evidence only. No DOM, storage, target snapping, or timers. */
export class PitchHold {
  private intervals: Interval[] = [];
  private previous: Observation | null = null;
  private lastTime: number | null = null;
  private started: number | null = null;
  private lastTone: number | null = null;

  get active(): boolean {
    return this.started !== null;
  }

  reset(): void {
    this.intervals = [];
    this.previous = null;
    this.lastTime = this.started = this.lastTone = null;
  }

  frame(
    now: number,
    frequency: number | null,
    target: PitchTarget,
    a4: number,
    holdSeconds: number,
    stability: number,
  ): { progress: number; result: PitchMeasurement | null } {
    if (
      this.lastTime !== null &&
      (now <= this.lastTime || now - this.lastTime > 250)
    )
      this.reset();
    // A breath or a long obstruction starts a new attempt, even with a long hold setting.
    if (this.lastTone !== null && now - this.lastTone > 350) this.reset();
    this.lastTime = now;
    const current: Observation | null =
      frequency !== null && Number.isFinite(frequency) && frequency > 0
        ? {
            time: now,
            frequency,
            cents: 1200 * Math.log2(frequency),
            status: evaluate(frequency, target, a4).status,
          }
        : null;
    if (current) {
      this.started ??= now;
      this.lastTone = now;
      if (
        this.previous &&
        this.previous.status === current.status &&
        Math.abs(this.previous.cents - current.cents) <= stability
      ) {
        // Credit only intervals bracketed by compatible, reliable observations.
        this.intervals.push({ ...current, start: this.previous.time });
      }
    }
    this.previous = current;
    const windowMs = holdSeconds * 1000,
      cutoff = now - windowMs;
    this.intervals = this.intervals.filter((sample) => sample.time > cutoff);
    let progress = 0;
    for (const status of ['correct', 'low', 'high'] as const) {
      const samples = this.intervals
        .filter((sample) => sample.status === status)
        .sort((a, b) => a.cents - b.cents);
      // Find the most-supported frequency band. Outliers do not expand its spread.
      let best: Interval[] = [],
        bestMs = 0,
        end = 0,
        total = 0;
      const weight = (sample: Interval) =>
        sample.time - Math.max(cutoff, sample.start);
      for (let start = 0; start < samples.length; start++) {
        while (
          end < samples.length &&
          samples[end].cents - samples[start].cents <= stability
        )
          total += weight(samples[end++]);
        if (total > bestMs) {
          bestMs = total;
          best = samples.slice(start, end);
        }
        total -= weight(samples[start]);
      }
      // Correct notes tolerate 15% missing/outlying evidence. A wrong result
      // still requires a full window of one stable pitch on the same side.
      const required = windowMs * (status === 'correct' ? 0.85 : 1);
      progress = Math.max(
        progress,
        Math.min(
          bestMs / required,
          this.started === null ? 0 : (now - this.started) / windowMs,
        ),
      );
      if (
        !current ||
        current.status !== status ||
        this.started === null ||
        now - this.started < windowMs ||
        bestMs + 1e-7 < required ||
        !best.length
      )
        continue;
      if (
        current.cents < best[0].cents ||
        current.cents > best[best.length - 1].cents
      )
        continue;
      let cumulative = 0;
      const median = best.find(
        (sample) => (cumulative += weight(sample)) >= bestMs / 2,
      )!;
      return { progress: 1, result: evaluate(median.frequency, target, a4) };
    }
    return { progress: Math.max(0, Math.min(1, progress)), result: null };
  }
}

/** Display-only median. Never reuse smoothed or missing readings as scoring evidence. */
export class PitchDisplay {
  private samples: { time: number; frequency: number }[] = [];

  reset(): void {
    this.samples = [];
  }

  frame(now: number, frequency: number | null): number | null {
    if (frequency === null) {
      this.reset();
      return null;
    }
    this.samples = this.samples.filter(
      (sample) => now > sample.time && now - sample.time <= 250,
    );
    this.samples.push({ time: now, frequency });
    this.samples = this.samples.slice(-3);
    const sorted = this.samples
      .map((sample) => sample.frequency)
      .sort((a, b) => a - b);
    // Show uncertainty during acquisition rather than a single-frame low/high claim.
    if (sorted.length < 3) return null;
    return sorted[1];
  }
}
