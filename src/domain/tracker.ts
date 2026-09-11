import type { PitchStatus, PitchTarget } from './pitch';

export interface Student {
  id: string;
  name: string;
  instrument: string;
  archived: boolean;
}
export interface TrackerClass {
  id: string;
  name: string;
  students: Student[];
}
export interface Attempt {
  id: string;
  studentId: string;
  name: string;
  instrument: string;
  time: number;
  status: PitchStatus;
  originalStatus?: PitchStatus;
  source: 'manual' | 'microphone' | 'corrected';
  frequency: number | null;
  cents: number | null;
  target: PitchTarget;
  a4: number;
}
export interface Session {
  id: string;
  classId: string;
  className: string;
  name: string;
  started: number;
  ended: number | null;
  roster: Student[];
  absent: string[];
  attempts: Attempt[];
  notes: Record<string, string>;
  note: string;
}
export interface TrackerData {
  schema: 1 | 2 | 3;
  classes: TrackerClass[];
  configs: Record<string, PitchTarget>;
  settings: {
    a4: number;
    hold: number;
    stability: number;
    gate: number;
    advance: boolean;
    /** Schema 3: null uses the shared popup duration default. */
    feedbackDurationMs?: number | null;
  };
  sessions: Session[];
  classId: string;
  activeSession: string | null;
  activeStudent: string | null;
  revision: number;
  lastBackup: number | null;
}
