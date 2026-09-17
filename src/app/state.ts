import { ClassroomListener, type AdvanceMode } from '../domain/classroom';
import type { Round } from '../domain/round';
import { PitchDisplay, PitchHold } from '../domain/pitch-hold';
import type { SessionView } from '../ui/classroom-view';
import { PitchFeedback } from '../ui/pitch-feedback';
/** Owns application-instance state; session rules use its browser-independent subset. */
import type { SessionState } from '../domain/session-changes';
import type { TrackerData } from '../domain/tracker';
import type { PitchStatus } from '../domain/pitch';
import type { TunerTransposition } from '../domain/tuner';
import type { createTrackerStore } from '../persistence/tracker-store';
export interface AppState extends SessionState {
  workspace: SessionView | null;
  roundQueue: Round | null;
  roundComplete: boolean;
  lastClassroomResult: string;
  classroomListener: ClassroomListener;
  classroomListenerReady: boolean;
  classroomPaused: boolean;
  classroomMode: AdvanceMode;
  clapNavigation: boolean;
  microphoneDevices: { deviceId: string; label: string }[];
  microphoneId: string;
  microphoneError: string;
  db: TrackerData;
  trackerStore: ReturnType<typeof createTrackerStore>;
  storageBlocked: boolean;
  loadedRaw: string | null;
  tab: string;
  search: string;
  filter: string;
  focusMode: boolean;
  historyStudent: string;
  settingsSection: 'instruments' | 'detection' | 'defaults';
  settingsInstrument: string;
  tunerTransposition: TunerTransposition;
  tunerTargetPitch: string;
  tunerStreak: number;
  tunerLastStatus: PitchStatus | '';
  tunerAwaitingRelease: boolean;
  tunerReleaseSince: number | null;
  toastTimer: ReturnType<typeof setTimeout> | undefined;
  pitchFeedback: PitchFeedback;
  disposed: boolean;
  checkGeneration: number;
  referenceStops: Set<() => void>;
  mic: boolean;
  stream: MediaStream | null;
  ctx: AudioContext | null;
  analyser: AnalyserNode | null;
  source: MediaStreamAudioSourceNode | null;
  raf: number;
  pendingMic: boolean;
  micGeneration: number;
  checking: { id: string; sid: string } | null;
  pitchHold: PitchHold;
  pitchDisplay: PitchDisplay;
  lastAnalysis: number;
  muteUntil: number;
  checkDeadline: number;
  buffer: Float32Array<ArrayBuffer>;
}
export function createState(
  db: TrackerData,
  trackerStore: AppState['trackerStore'],
): AppState {
  return {
    workspace: null,
    roundQueue: null,
    roundComplete: false,
    lastClassroomResult: '',
    classroomListener: new ClassroomListener(),
    classroomListenerReady: false,
    classroomPaused: false,
    classroomMode: 'one-and-done',
    clapNavigation: false,
    microphoneDevices: [],
    microphoneId: '',
    microphoneError: '',
    db,
    trackerStore,
    storageBlocked: false,
    loadedRaw: null,
    tab: 'classes',
    search: '',
    filter: 'all',
    focusMode: false,
    historyStudent: 'all',
    settingsSection: 'instruments',
    settingsInstrument: Object.keys(db.configs)[0] ?? '',
    tunerTransposition: 'concert',
    tunerTargetPitch: 'A4',
    tunerStreak: 0,
    tunerLastStatus: '',
    tunerAwaitingRelease: false,
    tunerReleaseSince: null,
    toastTimer: undefined,
    pitchFeedback: new PitchFeedback(),
    undoStack: [],
    disposed: false,
    checkGeneration: 0,
    referenceStops: new Set(),
    mic: false,
    stream: null,
    ctx: null,
    analyser: null,
    source: null,
    raf: 0,
    pendingMic: false,
    micGeneration: 0,
    checking: null,
    pitchHold: new PitchHold(),
    pitchDisplay: new PitchDisplay(),
    lastAnalysis: 0,
    muteUntil: 0,
    checkDeadline: 0,
    buffer: new Float32Array(4096),
  };
}
