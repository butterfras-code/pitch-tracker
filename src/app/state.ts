/** Owns application-instance state; session rules use its browser-independent subset. */
import type { SessionState } from '../domain/session-changes';
import type { TrackerData } from '../domain/tracker';
import type { createTrackerStore } from '../persistence/tracker-store';
export interface AppState extends SessionState {
  db: TrackerData;
  trackerStore: ReturnType<typeof createTrackerStore>;
  storageBlocked: boolean;
  loadedRaw: string | null;
  tab: string;
  search: string;
  filter: string;
  focusMode: boolean;
  historyStudent: string;
  toastTimer: ReturnType<typeof setTimeout> | undefined;
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
  holdSamples: number[];
  holdStart: number | null;
  lastFrame: number;
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
    db,
    trackerStore,
    storageBlocked: false,
    loadedRaw: null,
    tab: 'session',
    search: '',
    filter: 'all',
    focusMode: false,
    historyStudent: 'all',
    toastTimer: undefined,
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
    holdSamples: [],
    holdStart: null,
    lastFrame: 0,
    lastAnalysis: 0,
    muteUntil: 0,
    checkDeadline: 0,
    buffer: new Float32Array(4096),
  };
}
