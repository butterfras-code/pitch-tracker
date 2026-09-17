import { sessionDefaultsController } from './session-defaults-controller';
import { classroomController } from './classroom-controller';
/** Composes typed application methods around one live state object. */
import type { PitchMeasurement, PitchStatus } from '../domain/pitch';
import type {
  Attempt,
  Session,
  Student,
  TrackerClass,
} from '../domain/tracker';
import { backupController } from './backup-controller';
import { historyController } from './history-controller';
import { rosterController } from './roster-controller';
import { selectors } from './selectors';
import { sessionController } from './session-controller';
import { tunerController } from './tuner-controller';
import { detection } from '../audio/detection';
import { microphone } from '../audio/microphone';
import { fresh } from '../domain/defaults';
import { adminView } from '../ui/admin-view';
import { dialogs } from '../ui/dialogs';
import { historyView } from '../ui/history-view';
import { render } from '../ui/render';
import { sessionView } from '../ui/session-view';
import { tunerView } from '../ui/tuner-view';
import type { AppState } from './state';
import { createState } from './state';
export interface App extends AppState {
  applySessionDefaults(): void;
  saveSessionDefaults(): void;
  ensureRound(): void;
  resetRound(): void;
  renderClassroom(): void;
  classroomNavigate(direction: 1 | -1, manual?: boolean): void;
  shuffleStudents(): void;
  startRound(kind: 'whole' | 'retry'): void;
  classroomStatus(): string;
  toggleClassroomPause(): void;
  refreshMicrophones(): Promise<void>;
  changeMicrophone(id: string): Promise<void>;
  deleteStudent(id: string): void;
  save(): boolean;
  backup(): void;
  exportCSV(sid?: string): void;
  importBackup(e: Event): Promise<void>;
  resumeSession(id: string): void;
  deleteSession(id: string): void;
  applyAttemptEdit(sid: string, id: string): void;
  removeAttempt(sid: string, id: string): void;
  saveClass(rename: boolean): void;
  saveNewStudents(): void;
  saveStudent(id: string): void;
  archiveStudent(id: string): void;
  addInstrument(): void;
  deleteInstrument(): void;
  discardSettings(): void;
  selectSettingsSection(section: string): void;
  selectSettingsInstrument(name: string): void;
  saveDetectionSetting(): void;
  resetPitchTargets(): void;
  saveSettings(): void;
  setFeedbackDuration(value: string): void;
  setTunerTransposition(value: string): void;
  setTunerTargetPart(part: 'note' | 'octave', value: string): void;
  setTunerTargetLocked(locked: boolean): void;
  resetTunerAttempt(resetStreak?: boolean): void;
  completeTunerAttempt(measurement: PitchMeasurement): void;
  resetTunerStreak(): void;
  tunerResultText(): string;
  tunerStatus(): string;
  toggleTunerFullscreen(): Promise<void>;
  cls(): TrackerClass;
  ses(): Session | undefined;
  pupil(): Student | undefined;
  present(): Student[];
  attempts(id?: string, s?: Session): Attempt[];
  classOptions(): string;
  switchTab(t: string): void;
  selectStudent(id: string, rememberSelection?: boolean): void;
  changeClass(id: string): void;
  createSession(): void;
  endSession(): void;
  remember(): void;
  undo(): void;
  attendance(id: string, abs: boolean): void;
  pickNext(random: boolean): void;
  record(
    status: PitchStatus,
    id?: string | null,
    measurement?: PitchMeasurement | null,
  ): void;
  adminHTML(): string;
  settingsHTML(): string;
  helpHTML(): string;
  showDialog(html: string): void;
  closeDialog(): void;
  closeDialogIfOpen(): void;
  newSession(): void;
  sessionNotes(): void;
  studentDetail(id: string | null): void;
  editAttempt(sid: string, id: string): void;
  classDialog(rename?: boolean): void;
  addStudent(): void;
  editStudent(id: string): void;
  attemptTable(a: Attempt[], editable?: boolean, sid?: string): string;
  historyHTML(): string;
  render(): void;
  warning(message: string): void;
  toast(t: string): void;
  sessionHTML(): string;
  tunerHTML(): string;
  renderTuner(): void;
  renderCards(): void;
  audioLoop(now: number): void;
  context(): AudioContext;
  enableMic(): Promise<boolean>;
  toggleMic(): Promise<void>;
  stopMic(): void;
  cancelCheck(): void;
  startCheck(): Promise<void>;
  referenceTone(): Promise<void>;
}
export function createApplication(store: AppState['trackerStore']): App {
  return Object.assign(
    createState(fresh(), store),
    sessionController,
    tunerController,
    classroomController,
    sessionDefaultsController,
    historyController,
    rosterController,
    backupController,
    selectors,
    sessionView,
    tunerView,
    historyView,
    adminView,
    dialogs,
    render,
    microphone,
    detection,
  );
}
export function initializeApplication(app: App): void {
  const loaded = app.trackerStore.load();
  app.loadedRaw = loaded.raw;
  app.storageBlocked = loaded.blocked;
  app.db = loaded.data || app.db;
  app.applySessionDefaults();
  app.tab = app.ses() ? 'session' : 'classes';
  if (app.storageBlocked)
    app.warning(
      'Saved data could not be read. Existing storage has been left untouched. Export your current work before closing; use Help to download the unreadable data or restore a backup.',
    );
  if (!app.storageBlocked) app.save();
  else
    document.getElementById('saveStatus')!.textContent =
      'Not saved · export needed';
  app.render();
}
