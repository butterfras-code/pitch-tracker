import { describe, expect, it } from 'vitest';
import {
  chromaticTarget,
  displayedTargetNotes,
  displayedTunerNotes,
  nextStreak,
  tunerFeedbackTarget,
  tunerTarget,
} from '../../src/domain/tuner';

describe('tuner transposition', () => {
  it('converts written targets to the concert pitch the microphone hears', () => {
    expect(tunerTarget('C4', 'concert').pitch).toBe('C4');
    expect(tunerTarget('C4', 'bb').pitch).toBe('A♯3');
    expect(tunerTarget('C4', 'eb').pitch).toBe('D♯3');
    expect(tunerTarget('C4', 'f').pitch).toBe('F3');
  });

  it('shows detected concert and written notes without transposing detection', () => {
    expect(displayedTunerNotes(440, 440, 'concert')).toEqual({
      concert: 'A4',
      transposed: 'A4',
    });
    expect(displayedTunerNotes(392, 440, 'bb')).toEqual({
      concert: 'G4',
      transposed: 'A4',
    });
  });

  it('locks feedback to a pitch class while retaining an exact reference note', () => {
    expect(tunerFeedbackTarget('C4', 'bb')).toEqual({
      pitch: 'A♯',
      min: -25,
      max: 25,
    });
    expect(displayedTargetNotes('C4', 'bb')).toEqual({
      concert: 'A♯3',
      transposed: 'C4',
    });
    expect(chromaticTarget(445, 440).pitch).toBe('A4');
  });

  it('increments only correct streaks and resets misses', () => {
    expect(nextStreak(2, 'correct')).toBe(3);
    expect(nextStreak(3, 'low')).toBe(0);
    expect(nextStreak(3, 'high')).toBe(0);
  });
});
