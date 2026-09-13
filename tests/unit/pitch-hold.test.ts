import { describe, expect, it } from 'vitest';
import { PitchDisplay, PitchHold } from '../../src/domain/pitch-hold';

const target = { pitch: 'A4', min: -25, max: 25 };
const frequency = (cents: number) => 440 * 2 ** (cents / 1200);
const frame = (
  hold: PitchHold,
  now: number,
  f: number | null = 440,
  seconds = 2,
) => hold.frame(now, f, target, 440, seconds, 35);

describe('bounded pitch evidence', () => {
  it.each([220, 880, 880 * 2 ** (12 / 1200), null, 660])(
    'preserves progress through an isolated interruption (%s) without scoring it',
    (interruption) => {
      const hold = new PitchHold();
      let progress = 0;
      for (let t = 0; t <= 1900; t += 50) progress = frame(hold, t).progress;
      const paused = frame(hold, 1950, interruption);
      expect(paused.result).toBeNull();
      expect(paused.progress).toBeCloseTo(progress);
      expect(frame(hold, 2000).result).toBeNull();
      let result = null;
      for (let t = 2050; t <= 2300; t += 50) result ??= frame(hold, t).result;
      expect(result).toMatchObject({ status: 'correct', frequency: 440 });
    },
  );
  it.each([220, 880])(
    'assesses an initial wrong octave as played (%s)',
    (f) => {
      const hold = new PitchHold();
      for (let t = 0; t < 2000; t += 50)
        expect(frame(hold, t, f).result).toBeNull();
      expect(frame(hold, 2000, f).result).toMatchObject({
        status: f < 440 ? 'low' : 'high',
        frequency: f,
      });
    },
  );
  it.each([220, 880])(
    'requires a fresh hold for a sustained octave change (%s)',
    (f) => {
      const hold = new PitchHold();
      for (let t = 0; t <= 1800; t += 50) frame(hold, t);
      for (let t = 1850; t < 4100; t += 50)
        expect(frame(hold, t, f).result).toBeNull();
      expect(frame(hold, 4100, f).result).toMatchObject({
        status: f < 440 ? 'low' : 'high',
        frequency: f,
      });
    },
  );
  it('cannot complete on an octave glitch at the end of the hold', () => {
    const hold = new PitchHold();
    for (let t = 0; t < 2000; t += 50) frame(hold, t);
    expect(frame(hold, 2000, 880).result).toBeNull();
    expect(frame(hold, 2050, 880).result).toBeNull();
    expect(frame(hold, 2100).result).toBeNull();
    expect(frame(hold, 2150).result?.status).toBe('correct');
  });
  it('requires a full observation window even when the first 1.7 seconds are correct', () => {
    const hold = new PitchHold();
    for (let t = 0; t < 2000; t += 50) expect(frame(hold, t).result).toBeNull();
    expect(frame(hold, 2000).result?.status).toBe('correct');
  });
  it.each([null, 660])(
    'pauses and resumes correct evidence around a brief interruption (%s)',
    (interruption) => {
      const hold = new PitchHold();
      for (let t = 0; t < 2000; t += 50)
        frame(hold, t, t >= 900 && t <= 1100 ? interruption : 440);
      let result = null;
      for (let t = 2000; t <= 2350; t += 50) result ??= frame(hold, t).result;
      expect(result?.status).toBe('correct');
    },
  );
  it('does not average alternating flat and sharp readings into a correct note', () => {
    const hold = new PitchHold();
    for (let t = 0; t <= 6000; t += 50)
      expect(frame(hold, t, frequency(t % 100 ? 40 : -40)).result).toBeNull();
  });
  it('rejects too much intermittent evidence and cannot bank isolated short correct notes', () => {
    const hold = new PitchHold();
    for (let t = 0; t <= 10000; t += 50)
      expect(frame(hold, t, t % 500 < 300 ? 440 : null).result).toBeNull();
  });
  it('forgets a breath, resets explicitly, and cannot count a stalled callback as playing time', () => {
    for (const reset of ['breath', 'explicit', 'stall'] as const) {
      const hold = new PitchHold();
      for (let t = 0; t <= 1600; t += 50) frame(hold, t);
      if (reset === 'explicit') hold.reset();
      if (reset === 'breath')
        for (let t = 1650; t <= 2050; t += 50) frame(hold, t, null);
      for (let t = 2100; t <= 3000; t += 50)
        expect(frame(hold, t).result).toBeNull();
    }
  });
  it.each([392, 494])(
    'still records a sustained wrong note (%i Hz), with measured frequency',
    (f) => {
      const hold = new PitchHold();
      for (let t = 0; t < 2000; t += 50)
        expect(frame(hold, t, f).result).toBeNull();
      expect(frame(hold, 2000, f).result).toMatchObject({
        status: f < 440 ? 'low' : 'high',
        frequency: f,
      });
    },
  );
  it('requires full stable evidence for wrong results; an interruption cannot complete them', () => {
    const hold = new PitchHold();
    for (let t = 0; t <= 2000; t += 50)
      expect(frame(hold, t, t === 1000 ? null : 392).result).toBeNull();
  });
  it('does not credit silence, octave errors, or a wandering pitch as a correct hold', () => {
    for (const f of [
      (t: number) => (t % 400 < 200 ? 440 : 880),
      () => null,
      (t: number) => frequency(-24 + (t % 1000) * 0.048),
    ]) {
      const hold = new PitchHold();
      for (let t = 0; t <= 6000; t += 50)
        expect(frame(hold, t, f(t)).result).toBeNull();
    }
  });
  it('uses elapsed time rather than frame count at different analysis rates and hold settings', () => {
    for (const step of [50, 80, 100])
      for (const seconds of [0.5, 2, 5]) {
        const hold = new PitchHold();
        let result = null;
        for (let t = 0; t <= seconds * 1000 + step; t += step) {
          const next = frame(hold, t, 440, seconds).result;
          if (t < seconds * 1000) expect(next).toBeNull();
          result ??= next;
        }
        expect(result?.status).toBe('correct');
      }
  });
  it('uses current target/tuning and supports octave-free targets without forcing exact octaves', () => {
    const hold = new PitchHold();
    for (let t = 0; t < 2000; t += 50)
      hold.frame(t, 884, { ...target, pitch: 'A' }, 442, 2, 35);
    expect(
      hold.frame(2000, 884, { ...target, pitch: 'A' }, 442, 2, 35).result,
    ).toMatchObject({ status: 'correct', frequency: 884, cents: 0 });
  });
});

describe('live pitch display', () => {
  it('suppresses a single wrong frame, responds to sustained changes, and clears missing audio', () => {
    const display = new PitchDisplay();
    expect(display.frame(0, 440)).toBeNull();
    display.frame(80, 440);
    expect(display.frame(160, 660)).toBe(440);
    expect(display.frame(240, 660)).toBe(660);
    expect(display.frame(320, null)).toBeNull();
    expect(display.frame(400, 440)).toBeNull();
    expect(display.frame(1000, 440)).toBeNull();
    display.reset();
    expect(display.frame(1080, 440)).toBeNull();
  });
});
