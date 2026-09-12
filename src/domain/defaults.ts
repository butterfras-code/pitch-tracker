import { uid } from './identity';
import type { TrackerData } from './tracker';
const instruments = [
  'Flute',
  'Oboe',
  'Bassoon',
  'Clarinet',
  'Alto Saxophone',
  'Trumpet',
  'French Horn',
  'Trombone/Euphonium',
  'Tuba',
];
const pitches = ['A5', 'C5', 'C3', 'F#5', 'Ab4', 'F4', 'F3', 'F3', 'F2'];
const demoInstruments = [
  ...instruments.slice(0, 7),
  'Trombone/Euphonium',
  'Trombone/Euphonium',
  'Tuba',
];
export function defaultPitchTargets(): TrackerData['configs'] {
  return Object.fromEntries(
    instruments.map((n, i) => [
      n,
      {
        pitch: pitches[i],
        offset: n === 'Clarinet' ? 10 : 0,
        min: n === 'Clarinet' ? -10 : n === 'Tuba' ? -30 : -25,
        max: n === 'Clarinet' ? 90 : n === 'Tuba' ? 30 : 25,
      },
    ]),
  );
}
export function fresh(): TrackerData {
  const c = {
    id: uid(),
    name: 'Demo class',
    students: [
      'Maya',
      'Lucas',
      'Sofia',
      'Ethan',
      'Liam',
      'Noah',
      'Emma',
      'Ava',
      'James',
      'Oliver',
    ].map((name, i) => ({
      id: uid(),
      name,
      instrument: demoInstruments[i],
      archived: false,
    })),
  };
  return {
    schema: 2,
    classes: [c],
    configs: defaultPitchTargets(),
    settings: { a4: 440, hold: 2, stability: 35, gate: 0.015, advance: false },
    sessions: [],
    classId: c.id,
    activeSession: null,
    activeStudent: null,
    revision: 0,
    lastBackup: null,
  };
}
