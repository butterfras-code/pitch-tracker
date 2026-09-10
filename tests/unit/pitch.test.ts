import { describe, expect, it } from 'vitest';
import * as domain from '../../src/domain/pitch';

describe('existing pitch rules', () => {
  it('parses accidentals, octave-free notes and octave boundaries', () => {
    expect(domain.parseNote('F♯')).toEqual({ pc: 6, octave: null, midi: null });
    expect(domain.parseNote('Bb3')).toEqual({ pc: 10, octave: 3, midi: 58 });
    expect(domain.parseNote('B#4').midi).toBe(72);
    expect(domain.parseNote('Cb4').midi).toBe(59);
    expect(() => domain.parseNote('H4')).toThrow('Invalid note');
  });
  it('treats the configured cents limits as inclusive, including zero', () => {
    const target = { pitch: 'A4', min: 0, max: 100 };
    for (const [cents, status] of [
      [-1, 'low'],
      [0, 'correct'],
      [100, 'correct'],
      [101, 'high'],
    ] as const) {
      expect(
        domain.evaluate(440 * 2 ** (cents / 1200), target, 440).status,
      ).toBe(status);
    }
  });
  it('distinguishes octave-free and exact targets and respects tuning', () => {
    expect(
      domain.evaluate(880, { pitch: 'A', min: -25, max: 25 }, 440).status,
    ).toBe('correct');
    expect(
      domain.evaluate(880, { pitch: 'A4', min: -25, max: 25 }, 440).status,
    ).toBe('high');
    expect(
      domain.evaluate(442, { pitch: 'A4', min: 0, max: 0 }, 442).cents,
    ).toBeCloseTo(0);
  });
  it('rejects silence and detects a synthetic A4 tone', () => {
    expect(domain.detectPitch(new Float32Array(4096), 48000, 0.015)).toBeNull();
    const tone = Float32Array.from(
      { length: 4096 },
      (_, i) => 0.2 * Math.sin((2 * Math.PI * 440 * i) / 48000),
    );
    expect(domain.detectPitch(tone, 48000, 0.015)).toBeCloseTo(440, 0);
  });
});
