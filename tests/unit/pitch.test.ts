import { describe, expect, it } from 'vitest';
import * as domain from '../../src/domain/pitch';
import { pitchSignal } from '../fixtures/pitch-signal';

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

describe('pitch detection in mixed audio', () => {
  it.each([
    { frequency: 220, harmonics: [0.12, 0.1, 1] },
    { frequency: 311.13, harmonics: [0.1, 0.05, 0.12, 0.06, 1] },
    { frequency: 196, harmonics: [0.1, 0.05, 0.1, 0.05, 0.1, 0.05, 1] },
  ])(
    'rejects a dominant overtone and recovers the $frequency Hz fundamental',
    ({ frequency, harmonics }) => {
      for (const sampleRate of [44100, 48000, 96000]) {
        const detected = domain.detectPitch(
          pitchSignal({ frequency, harmonics, sampleRate }),
          sampleRate,
          0.015,
        );
        expect(detected).not.toBeNull();
        expect(Math.abs(1200 * Math.log2(detected! / frequency))).toBeLessThan(
          5,
        );
      }
    },
  );
  it.each([44100, 48000])(
    'keeps A accurate with broadband noise and a quieter motor-like hum at %i Hz',
    (sampleRate) => {
      for (const phase of [0, 0.7, 2.1]) {
        const frequency = domain.detectPitch(
          pitchSignal({ sampleRate, noise: 0.12, hum: 0.03, phase }),
          sampleRate,
          0.015,
        );
        expect(frequency).not.toBeNull();
        expect(Math.abs(1200 * Math.log2(frequency! / 440))).toBeLessThan(10);
      }
    },
  );
  it.each([55, 65.41, 110, 220, 440, 880, 1568])(
    'preserves clean instrument-range tones at %f Hz',
    (frequency) => {
      for (const sampleRate of [44100, 48000, 96000]) {
        const detected = domain.detectPitch(
          pitchSignal({ frequency, sampleRate }),
          sampleRate,
          0.015,
        );
        expect(detected).not.toBeNull();
        expect(Math.abs(1200 * Math.log2(detected! / frequency))).toBeLessThan(
          5,
        );
      }
    },
  );
  it('finds a fundamental beneath louder harmonics', () => {
    const detected = domain.detectPitch(
      pitchSignal({ frequency: 220, harmonics: [0.4, 1, 0.6], noise: 0.05 }),
      48000,
      0.015,
    );
    expect(detected).toBeCloseTo(220, 0);
  });
  it('rejects noise alone, an isolated impact, and a tone buried in noise', () => {
    for (const seed of [7, 1234, 56789]) {
      expect(
        domain.detectPitch(
          pitchSignal({ amplitude: 0, noise: 0.3, seed }),
          48000,
          0.015,
        ),
      ).toBeNull();
      expect(
        domain.detectPitch(
          pitchSignal({ amplitude: 0.01, noise: 0.3, seed }),
          48000,
          0.015,
        ),
      ).toBeNull();
    }
    const impact = new Float32Array(4096);
    impact[600] = 1;
    expect(domain.detectPitch(impact, 48000, 0.001)).toBeNull();
  });
});
