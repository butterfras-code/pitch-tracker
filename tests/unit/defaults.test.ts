import { describe, expect, it } from 'vitest';
import { fresh } from '../../src/domain/defaults';
import { validateBackup } from '../../src/domain/backup';

describe('fresh tracker defaults', () => {
  it('uses score-order band instruments and their concert pitch targets', () => {
    const data = fresh();

    expect(Object.keys(data.configs)).toEqual([
      'Flute',
      'Oboe',
      'Bassoon',
      'Clarinet',
      'Alto Saxophone',
      'Trumpet',
      'French Horn',
      'Trombone/Euphonium',
      'Tuba',
    ]);
    expect(
      Object.fromEntries(
        Object.entries(data.configs).map(([name, target]) => [
          name,
          [target.pitch, target.offset],
        ]),
      ),
    ).toEqual({
      Flute: ['A5', 0],
      Oboe: ['C5', 0],
      Bassoon: ['C3', 0],
      Clarinet: ['F#5', 10],
      'Alto Saxophone': ['Ab4', 0],
      Trumpet: ['F4', 0],
      'French Horn': ['F3', 0],
      'Trombone/Euphonium': ['F3', 0],
      Tuba: ['F2', 0],
    });
    expect(
      data.classes[0].students.map((student) => student.instrument),
    ).toEqual([
      'Flute',
      'Oboe',
      'Bassoon',
      'Clarinet',
      'Alto Saxophone',
      'Trumpet',
      'French Horn',
      'Trombone/Euphonium',
      'Trombone/Euphonium',
      'Tuba',
    ]);
    expect(data.configs.Clarinet).toEqual({
      pitch: 'F#5',
      offset: 10,
      min: -10,
      max: 90,
    });
    expect(validateBackup(data)).toBe(data);
  });
});
