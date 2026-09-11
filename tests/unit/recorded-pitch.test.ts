import { describe, expect, it } from 'vitest';
import { detectPitch } from '../../src/domain/pitch';
import { recordedAudio, recordings } from '../fixtures/recorded-audio';

describe('user recordings with dominant overtones', () => {
  it.each(recordings)(
    '$file follows its measured $sounding fundamental, not its filename or loudest overtone',
    ({ file, hz }) => {
      const samples = recordedAudio(file);
      let detected = 0;
      for (let i = 0; i + 4096 <= samples.length; i += 3840) {
        const frequency = detectPitch(
          samples.subarray(i, i + 4096),
          48000,
          0.015,
        );
        if (frequency !== null) {
          detected++;
          expect(
            Math.abs(1200 * Math.log2(frequency / hz)),
            `at ${i / 48000}s: ${frequency} Hz`,
          ).toBeLessThan(25);
        }
      }
      expect(detected).toBeGreaterThan(20);
    },
  );
});
