import { describe, expect, it } from 'vitest';
import {
  ClassroomListener,
  shouldAdvance,
  adjacentStudent,
} from '../../src/domain/classroom';

describe('classroom turn rules', () => {
  it('advances according to the selected policy; one and done accepts any completed result', () => {
    expect(shouldAdvance(true, 'until-correct', 'low')).toBe(false);
    expect(shouldAdvance(true, 'until-correct', 'correct')).toBe(true);
    expect(shouldAdvance(true, 'one-and-done', 'high')).toBe(true);
    expect(shouldAdvance(false, 'one-and-done', 'correct')).toBe(false);
  });
  it('walks the present roster without wrapping and supports going back', () => {
    expect(adjacentStudent(['a', 'c'], 'a', 1)).toBe('c');
    expect(adjacentStudent(['a', 'c'], 'c', 1)).toBe(null);
    expect(adjacentStudent(['a', 'c'], 'c', -1)).toBe('a');
    expect(adjacentStudent(['a', 'c'], 'a', -1)).toBe('a');
  });
});

describe('microphone handoff and clap commands', () => {
  const frame = (
    listener: ClassroomListener,
    time: number,
    rms = 0,
    frequency: number | null = null,
    enabled = true,
  ) => listener.frame(time, rms, frequency, 0.015, enabled);
  it('requires quiet or settled background, not a short loss of pitch, after every reset', () => {
    const l = new ClassroomListener();
    for (let t = 0; t <= 1000; t += 100)
      expect(frame(l, t, 0.2, 440).ready).toBe(false);
    for (let t = 1100; t <= 1800; t += 100)
      expect(frame(l, t, 0.1).ready).toBe(false);
    for (let t = 1900; t < 2400; t += 100)
      expect(frame(l, t).ready).toBe(false);
    expect(frame(l, 2400).ready).toBe(true);
    l.reset();
    expect(frame(l, 2500, 0.2, 440).ready).toBe(false);
  });
  it('accepts an explicit start without quiet but requires release after a completed attempt', () => {
    const l = new ClassroomListener();
    l.start();
    expect(frame(l, 0, 0.2, 440, false).ready).toBe(true);
    l.reset(0.2);
    for (let t = 100; t <= 2000; t += 100)
      expect(frame(l, t, 0.2, 440, false).ready).toBe(false);
    l.start();
    expect(frame(l, 2100, 0.2, 440, false).ready).toBe(true);
  });
  it('arms over settled unpitched background and does not learn a sustained note as background', () => {
    const l = new ClassroomListener();
    for (let t = 0; t < 800; t += 100)
      expect(frame(l, t, 0.08, null, false).ready).toBe(false);
    expect(frame(l, 800, 0.08, null, false).ready).toBe(true);
    l.reset();
    for (let t = 900; t <= 5000; t += 100)
      expect(frame(l, t, 0.08, 440, false).ready).toBe(false);
  });
  it('does not mistake fluctuating noise or missing observations for a settled background', () => {
    const l = new ClassroomListener();
    for (let t = 0; t <= 3000; t += 100)
      expect(frame(l, t, t % 200 ? 0.15 : 0.05, null, false).ready).toBe(false);
    for (let t = 3100; t <= 3700; t += 100) frame(l, t, 0.08, null, false);
    expect(frame(l, 4500, 0.08, null, false).ready).toBe(false);
  });
  it('does not treat a missing audio interval as continuous silence', () => {
    const l = new ClassroomListener();
    frame(l, 0);
    expect(frame(l, 1000).ready).toBe(false);
  });
  it('uses a completed attempt to recognize fluctuating quieter noise', () => {
    const l = new ClassroomListener();
    for (let t = 0; t <= 700; t += 100)
      frame(l, t, t === 300 ? 0.8 : 0.2, 440, false);
    expect(l.attemptLevel).toBe(0.2);
    l.reset(l.attemptLevel);
    for (let t = 800; t < 1400; t += 100)
      expect(frame(l, t, t % 200 ? 0.06 : 0.02, null, false).ready).toBe(false);
    expect(frame(l, 1400, 0.04, null, false).ready).toBe(true);
  });
  it('rejects a decrescendo, pitch changes, and tones below the scoring gate', () => {
    const l = new ClassroomListener();
    l.reset(0.2);
    for (let t = 0; t <= 5000; t += 100)
      expect(
        frame(l, t, t < 1000 ? 0.2 : 0.005, t % 200 ? 440 : 392, false).ready,
      ).toBe(false);
  });
  it('restarts release evidence after pitch returns, a loud interruption, or a missing interval', () => {
    for (const interruption of ['pitch', 'loud', 'gap'] as const) {
      const l = new ClassroomListener();
      l.reset(0.2);
      for (let t = 0; t <= 400; t += 100) frame(l, t, 0.02, null, false);
      const start = interruption === 'gap' ? 1000 : 500;
      expect(
        frame(
          l,
          start,
          interruption === 'loud' ? 0.15 : 0.02,
          interruption === 'pitch' ? 440 : null,
          false,
        ).ready,
      ).toBe(false);
      for (let t = start + 100; t <= start + 500; t += 100)
        expect(frame(l, t, t % 200 ? 0.02 : 0.06, null, false).ready).toBe(
          false,
        );
      expect(frame(l, start + 700, 0.03, null, false).ready).toBe(true);
    }
  });
  it('discards the completed level on ordinary navigation/reset', () => {
    const l = new ClassroomListener();
    l.reset(0.2);
    l.reset();
    for (let t = 0; t <= 2000; t += 100)
      expect(frame(l, t, t % 200 ? 0.02 : 0.06, null, false).ready).toBe(false);
  });
  function clap(l: ClassroomListener, t: number, enabled = true) {
    frame(l, t, 0.2, null, enabled);
    return frame(l, t + 70, 0, null, enabled);
  }
  it('waits after two claps and emits only next', () => {
    const l = new ClassroomListener();
    clap(l, 100);
    clap(l, 400);
    expect(frame(l, 700).command).toBe(null);
    expect(frame(l, 1000).command).toBe('next');
    expect(frame(l, 1100).command).toBe(null);
  });
  it('three claps emit only previous; four claps are rejected', () => {
    const l = new ClassroomListener();
    clap(l, 100);
    clap(l, 400);
    clap(l, 700);
    expect(frame(l, 1300).command).toBe('previous');
    l.reset();
    clap(l, 2000);
    clap(l, 2300);
    clap(l, 2600);
    clap(l, 2900);
    expect(frame(l, 3500).command).toBe(null);
  });
  it('ignores disabled commands, sustained noise and pitched instrument attacks', () => {
    const l = new ClassroomListener();
    clap(l, 100, false);
    clap(l, 400, false);
    expect(frame(l, 1000, 0, null, false).command).toBe(null);
    for (let t = 1100; t < 1600; t += 70) frame(l, t, 0.2);
    frame(l, 1600);
    expect(frame(l, 2200).command).toBe(null);
    frame(l, 2300, 0.2, 440);
    frame(l, 2370);
    frame(l, 2600, 0.2, 440);
    frame(l, 2670);
    expect(frame(l, 3300).command).toBe(null);
  });
});
