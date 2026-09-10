import { describe, expect, it } from 'vitest';
import { parseBackup, validateBackup } from '../../src/domain/backup';
import { trackerFixture } from '../fixtures/tracker';

describe('v1 backup validation', () => {
  it('round-trips all v1 data and leaves the input and extra fields intact', () => {
    const data = { ...trackerFixture(), extension: 'preserved' };
    const before = JSON.stringify(data);
    expect(validateBackup(data)).toBe(data);
    expect(parseBackup(before)).toEqual(data);
    expect(JSON.stringify(data)).toBe(before);
  });
  it.each([
    null,
    [],
    {},
    { schema: 2 },
    { ...trackerFixture(), revision: -1 },
    { ...trackerFixture(), classes: [null] },
  ])('rejects malformed roots and records: %j', (value) => {
    expect(() => validateBackup(value)).toThrow();
  });
  it.each([
    'duplicate',
    'missing-class',
    'missing-student',
    'invalid-pitch',
    'invalid-range',
    'invalid-settings',
    'duplicate-open-session',
    'ended-active-session',
    'orphan-note',
    'invalid-status',
  ])('rejects %s without mutating the input', (scenario) => {
    const data = trackerFixture();
    switch (scenario) {
      case 'duplicate':
        data.classes.push(structuredClone(data.classes[0]));
        break;
      case 'missing-class':
        data.sessions[0].classId = 'missing';
        break;
      case 'missing-student':
        data.sessions[0].attempts[0].studentId = 'missing';
        break;
      case 'invalid-pitch':
        data.configs.Flute.pitch = 'H4';
        break;
      case 'invalid-range':
        data.configs.Flute.min = 26;
        break;
      case 'invalid-settings':
        data.settings.gate = 0;
        break;
      case 'duplicate-open-session':
        data.sessions.push({
          ...structuredClone(data.sessions[0]),
          id: 'session-2',
        });
        break;
      case 'ended-active-session':
        data.sessions[0].ended = 3000;
        break;
      case 'orphan-note':
        data.sessions[0].notes.missing = 'Note';
        break;
      case 'invalid-status':
        Object.assign(data.sessions[0].attempts[0], { status: ['correct'] });
        break;
    }
    const before = JSON.stringify(data);
    expect(() => validateBackup(data)).toThrow();
    expect(JSON.stringify(data)).toBe(before);
  });
});
