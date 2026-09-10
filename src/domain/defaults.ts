import { uid } from './identity';
import type { TrackerData } from './tracker';
const instruments = [
  'Flute',
  'Clarinet',
  'Saxophone',
  'Oboe',
  'Bassoon',
  'Trumpet',
  'French Horn',
  'Trombone',
  'Euphonium',
  'Tuba',
];
const pitches = ['A', 'F#', 'Ab', 'C', 'F', 'C', 'F', 'F', 'F', 'F'];
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
      instrument: instruments[i],
      archived: false,
    })),
  };
  return {
    schema: 1,
    classes: [c],
    configs: Object.fromEntries(
      instruments.map((n, i) => [
        n,
        {
          pitch: pitches[i],
          min: i === 1 ? 0 : i === 9 ? -30 : -25,
          max: i === 1 ? 100 : i === 9 ? 30 : 25,
        },
      ]),
    ),
    settings: { a4: 440, hold: 2, stability: 35, gate: 0.015, advance: false },
    sessions: [],
    classId: c.id,
    activeSession: null,
    activeStudent: null,
    revision: 0,
    lastBackup: null,
  };
}
