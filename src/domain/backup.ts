import { sessionDefaults } from './session-defaults';
import { parseNote } from './pitch';
import type { TrackerData } from './tracker';

function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error('This is not a valid Pitch Tracker backup.');
}
function object(value: unknown): asserts value is Record<string, unknown> {
  requireValid(
    value !== null && typeof value === 'object' && !Array.isArray(value),
  );
}
function array(value: unknown): asserts value is unknown[] {
  requireValid(Array.isArray(value));
}
const str = (value: unknown, max = 120): value is string =>
  typeof value === 'string' && value.length <= max;
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
function ids(items: unknown[]): Set<unknown> {
  const found = new Set<unknown>();
  for (const item of items) {
    object(item);
    requireValid(
      str(item.id) &&
        item.id &&
        /^[a-zA-Z0-9-]+$/.test(item.id) &&
        !found.has(item.id),
    );
    found.add(item.id);
  }
  return found;
}
function target(value: unknown, schema: unknown) {
  object(value);
  requireValid(
    str(value.pitch) &&
      finite(value.min, -600, 600) &&
      finite(value.max, -600, 600) &&
      value.min <= value.max,
  );
  parseNote(value.pitch);
  requireValid(
    schema === 1
      ? value.offset === undefined
      : value.offset === undefined || finite(value.offset, -600, 600),
  );
}

/** Validate supported versions without mutating the input. */
export function validateBackup(value: unknown): TrackerData {
  object(value);
  const d = value;
  requireValid(
    (d.schema === 1 || d.schema === 2 || d.schema === 3) &&
      finite(d.revision, 0, Infinity) &&
      Number.isInteger(d.revision),
  );
  array(d.classes);
  array(d.sessions);
  object(d.configs);
  object(d.settings);
  requireValid(d.classes.length);
  const configs = d.configs;
  for (const [key, config] of Object.entries(configs)) {
    requireValid(
      str(key) &&
        key &&
        !['__proto__', 'constructor', 'prototype'].includes(key),
    );
    target(config, d.schema);
  }
  requireValid(Object.keys(configs).length);
  const st = d.settings;
  requireValid(
    d.schema === 3
      ? st.feedbackDurationMs === null ||
          (finite(st.feedbackDurationMs, 500, 30000) &&
            Number.isInteger(st.feedbackDurationMs))
      : st.feedbackDurationMs === undefined,
  );
  requireValid(
    finite(st.a4, 400, 480) &&
      finite(st.hold, 0.5, 5) &&
      finite(st.stability, 5, 100) &&
      finite(st.gate, 0.001, 0.2) &&
      typeof st.advance === 'boolean',
  );
  if (d.schema === 3) {
    object(d.sessionDefaults);
    const defaults = d.sessionDefaults;
    requireValid(
      typeof defaults.advance === 'boolean' &&
        typeof defaults.claps === 'boolean' &&
        typeof defaults.teacher === 'boolean' &&
        (defaults.mode === 'until-correct' ||
          defaults.mode === 'one-and-done') &&
        ['auto', 'split', 'student', 'class'].includes(String(defaults.view)) &&
        typeof defaults.view === 'string',
    );
  }
  const classIds = ids(d.classes),
    sessionIds = ids(d.sessions);
  requireValid(
    classIds.has(d.classId) &&
      (d.activeSession === null || sessionIds.has(d.activeSession)) &&
      (d.activeStudent === null || str(d.activeStudent)),
  );
  const student = (p: unknown) => {
    object(p);
    requireValid(
      str(p.name) &&
        p.name.trim() &&
        typeof p.instrument === 'string' &&
        Object.hasOwn(configs, p.instrument) &&
        typeof p.archived === 'boolean',
    );
  };
  for (const c of d.classes) {
    object(c);
    requireValid(str(c.name) && c.name.trim());
    array(c.students);
    ids(c.students);
    c.students.forEach(student);
  }
  const open = new Set<unknown>();
  for (const s of d.sessions) {
    object(s);
    requireValid(
      classIds.has(s.classId) &&
        str(s.className) &&
        str(s.name) &&
        finite(s.started, 0, 8640000000000000) &&
        (s.ended === null || finite(s.ended, s.started, 8640000000000000)) &&
        str(s.note, 10000),
    );
    array(s.roster);
    array(s.absent);
    array(s.attempts);
    object(s.notes);
    const pupilIds = ids(s.roster);
    s.roster.forEach(student);
    requireValid(
      s.absent.every((id) => pupilIds.has(id)) &&
        Object.entries(s.notes).every(
          ([key, note]) => pupilIds.has(key) && str(note, 10000),
        ),
    );
    ids(s.attempts);
    if (s.ended === null) {
      requireValid(!open.has(s.classId));
      open.add(s.classId);
    }
    for (const a of s.attempts) {
      object(a);
      requireValid(
        pupilIds.has(a.studentId) &&
          str(a.name) &&
          str(a.instrument) &&
          typeof a.status === 'string' &&
          ['low', 'correct', 'high'].includes(a.status) &&
          typeof a.source === 'string' &&
          ['manual', 'microphone', 'corrected'].includes(a.source) &&
          finite(a.time, 0, 8640000000000000) &&
          (a.frequency === null || finite(a.frequency, 1, 50000)) &&
          (a.cents === null || finite(a.cents, -20000, 20000)) &&
          finite(a.a4, 400, 480),
      );
      target(a.target, d.schema);
    }
  }
  // All records have now been checked; narrow the validated graph for references.
  const data = d as unknown as TrackerData;
  const active = data.sessions.find((s) => s.id === data.activeSession);
  if (active)
    requireValid(
      active.classId === data.classId &&
        active.ended === null &&
        (data.activeStudent === null ||
          active.roster.some((p) => p.id === data.activeStudent)),
    );
  else requireValid(data.activeStudent === null);
  requireValid(
    data.lastBackup === null || finite(data.lastBackup, 0, 8640000000000000),
  );
  return data;
}

export function parseBackup(text: string): TrackerData {
  return validateBackup(JSON.parse(text));
}

/** Explicit, lossless upgrade when the new target editor is saved. */
export function migrateToV2(value: TrackerData): TrackerData {
  const data = structuredClone(validateBackup(value));
  if (data.schema === 1) data.schema = 2;
  for (const config of Object.values(data.configs)) config.offset ??= 0;
  for (const session of data.sessions)
    for (const attempt of session.attempts) attempt.target.offset ??= 0;
  return validateBackup(data);
}

/** Opt-in upgrade when the user saves a popup-duration preference. */
export function withFeedbackDuration(
  value: TrackerData,
  durationMs: number | null,
): TrackerData {
  const data = migrateToV2(value);
  const defaults = sessionDefaults(data);
  data.schema = 3;
  data.settings.feedbackDurationMs = durationMs;
  data.sessionDefaults = defaults;
  return validateBackup(data);
}

/** Saving session defaults explicitly upgrades older backups without changing sessions. */
export function migrateToV3(value: TrackerData): TrackerData {
  const data = migrateToV2(value);
  const defaults = sessionDefaults(data);
  data.schema = 3;
  data.settings.feedbackDurationMs ??= null;
  data.sessionDefaults = defaults;
  return validateBackup(data);
}
