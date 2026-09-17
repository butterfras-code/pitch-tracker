import { parseNote, type PitchStatus, type PitchTarget } from './pitch';

export const tunerTranspositions = [
  { id: 'concert', label: 'Concert pitch', semitones: 0 },
  { id: 'bb', label: 'B♭ transposition', semitones: -2 },
  { id: 'eb', label: 'E♭ transposition', semitones: -9 },
  { id: 'f', label: 'F transposition', semitones: -7 },
] as const;

export type TunerTransposition = (typeof tunerTranspositions)[number]['id'];

const sharpNames = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
];

export function transposition(id: TunerTransposition) {
  return tunerTranspositions.find((item) => item.id === id)!;
}

export function noteFromMidi(midi: number): string {
  const rounded = Math.round(midi);
  return `${sharpNames[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

export function midiFromFrequency(frequency: number, a4: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / a4));
}

export function tunerTarget(
  writtenPitch: string,
  transpositionId: TunerTransposition,
  min = -25,
  max = 25,
): PitchTarget {
  const written = parseNote(writtenPitch);
  if (written.midi === null) throw Error('Tuner targets require an octave.');
  const concertPitch = noteFromMidi(
    written.midi + transposition(transpositionId).semitones,
  );
  return { pitch: concertPitch, min, max };
}

export function displayedTunerNotes(
  frequency: number,
  a4: number,
  transpositionId: TunerTransposition,
): { concert: string; transposed: string } {
  const concertMidi = midiFromFrequency(frequency, a4);
  return {
    concert: noteFromMidi(concertMidi),
    transposed: noteFromMidi(
      concertMidi - transposition(transpositionId).semitones,
    ),
  };
}

export function nextStreak(streak: number, status: PitchStatus): number {
  return status === 'correct' ? streak + 1 : 0;
}
