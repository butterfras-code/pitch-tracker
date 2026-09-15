import type { TrackerData } from './tracker';

export interface SessionDefaults {
  advance: boolean;
  mode: 'until-correct' | 'one-and-done';
  claps: boolean;
  teacher: boolean;
  view: 'auto' | 'split' | 'student' | 'class';
}

export function sessionDefaults(data: TrackerData): SessionDefaults {
  return data.schema === 3 && data.sessionDefaults
    ? { ...data.sessionDefaults }
    : {
        advance: data.settings.advance,
        mode: 'one-and-done',
        claps: false,
        teacher: false,
        view: 'auto',
      };
}
