import { editTarget, editDetection } from './pitch-settings';
/** Delegated callbacks resolve current application state on every invocation. */
import { isPitchStatus } from '../domain/pitch';
import type { App } from '../app/application';
import type { UiBindings } from './events';
import { $, download } from './helpers';

export function createBindings(app: App): UiBindings {
  return {
    click: {
      'target-clef': ({ element }) => editTarget(element, 'clef'),
      'target-clef-auto': ({ element }) => editTarget(element, 'auto'),
      'target-reset': ({ element }) => {
        editTarget(element, 'reset');
      },
      'session-view': ({ data }) =>
        app.workspace?.setView(data.view ?? 'split'),
      'session-fullscreen': () => app.workspace?.fullscreen(),
      'tuner-fullscreen': () => void app.toggleTunerFullscreen(),
      'reset-tuner-streak': () => app.resetTunerStreak(),
      'show-current': () => {
        app.search = '';
        app.filter = 'all';
        app.renderCards();
        app.workspace?.follow();
      },
      'previous-student': () => app.classroomNavigate(-1),
      'pause-listening': () => app.toggleClassroomPause(),
      'restart-round': () => app.startRound('whole'),
      'retry-round': () => app.startRound('retry'),
      'delete-student': ({ data }) => app.deleteStudent(data.id!),
      backup: () => app.backup(),
      'session-notes': () => app.sessionNotes(),
      'end-session': () => app.endSession(),
      'new-session': () => app.newSession(),
      'start-class-session': ({ data }) => {
        if (!app.db.classes.some((c) => c.id === data.id)) return;
        const alreadySelected = app.db.classId === data.id && app.ses();
        if (!alreadySelected) app.changeClass(data.id!);
        if (app.ses()) {
          app.tab = 'session';
          app.render();
        } else app.newSession();
      },
      'back-to-classes': () => app.switchTab('classes'),
      'edit-class': ({ data }) => {
        if (!app.db.classes.some((c) => c.id === data.id)) return;
        app.tab = 'admin';
        app.changeClass(data.id!);
      },
      undo: () => app.undo(),
      'toggle-mic': () => app.toggleMic(),
      'turn-microphone-off': () => {
        app.stopMic();
        app.render();
      },
      'clap-navigation-toggle': ({ element }) => {
        const enabled = element.getAttribute('aria-pressed') !== 'true';
        app.clapNavigation = enabled;
        app.cancelCheck();
        app.render();
        app.workspace?.showClapInstructions(enabled);
      },
      'reference-tone': () => app.referenceTone(),
      'start-check': () => app.startCheck(),
      'close-dialog': () => app.closeDialog(),
      'add-students': () => app.addStudent(),
      'add-instrument': () => app.addInstrument(),
      'delete-instrument': () => app.deleteInstrument(),
      'discard-settings': () => app.discardSettings(),
      'reset-pitch-targets': () => app.resetPitchTargets(),
      'toggle-focus': () => {
        app.focusMode = !app.focusMode;
        app.render();
      },
      'cancel-check': () => {
        app.cancelCheck();
        app.render();
      },
      'next-student': () => app.classroomNavigate(1),
      'shuffle-students': () => app.shuffleStudents(),
      'active-student-notes': () => app.studentDetail(app.db.activeStudent),
      record: ({ data }) => {
        if (isPitchStatus(data.status)) app.record(data.status, data.id);
      },
      'select-student': ({ data }) => app.selectStudent(data.id!),
      'select-card': ({ data, event }) => {
        if (
          event.target instanceof Element &&
          !event.target.closest(
            'button, input, select, textarea, a, .card-feedback',
          ) &&
          data.id !== app.db.activeStudent
        )
          app.selectStudent(data.id!);
      },
      'toggle-attendance': ({ data, element }) => {
        app.attendance(
          data.id!,
          element.getAttribute('aria-pressed') !== 'true',
        );
      },
      'student-notes': ({ data }) => app.studentDetail(data.id!),
      'resume-session': ({ data }) => app.resumeSession(data.id!),
      'export-csv': ({ data }) => app.exportCSV(data.id),
      'delete-session': ({ data }) => app.deleteSession(data.id!),
      'edit-student': ({ data }) => app.editStudent(data.id!),
      'archive-student': ({ data }) => app.archiveStudent(data.id!),
      print: () => window.print(),
      'edit-attempt': ({ data }) => app.editAttempt(data.sessionId!, data.id!),
      'remove-attempt': ({ data }) =>
        app.removeAttempt(data.sessionId!, data.id!),
      'restore-backup': () => $('importFile').click(),
      'new-class': () => app.classDialog(),
      'rename-class': () => app.classDialog(true),
      'download-unreadable': () =>
        download(
          app.loadedRaw ?? '',
          'pitch-tracker-unreadable.json',
          'application/json',
        ),
      'switch-tab': ({ data }) => app.switchTab(data.tab!),
      'settings-section': ({ data }) =>
        app.selectSettingsSection(data.section!),
    },
    change: {
      'feedback-duration': ({ value, element }) => {
        if (element instanceof HTMLInputElement && element.reportValidity())
          app.setFeedbackDuration(value);
      },
      'target-scale': ({ element }) => editTarget(element, 'scale'),
      'target-note': ({ element }) => {
        editTarget(element, 'note');
      },
      'settings-instrument': ({ value }) => app.selectSettingsInstrument(value),
      'session-defaults-auto-save': () => app.saveSessionDefaults(),
      'microphone-input': ({ value }) => app.changeMicrophone(value),
      'tuner-transposition': ({ value }) => app.setTunerTransposition(value),
      'tuner-target-note': ({ value }) => app.setTunerTargetPart('note', value),
      'tuner-target-octave': ({ value }) =>
        app.setTunerTargetPart('octave', value),
      'tuner-target-lock': ({ checked }) => app.setTunerTargetLocked(checked),
      'session-advance': ({ value }) => {
        if (!['manual', 'when-correct', 'after-attempt'].includes(value))
          return;
        app.db.settings.advance = value !== 'manual';
        app.classroomMode =
          value === 'after-attempt' ? 'one-and-done' : 'until-correct';
        app.cancelCheck();
        app.save();
        app.render();
      },
      'classroom-mode': ({ value }) => {
        if (value !== 'until-correct' && value !== 'one-and-done') return;
        app.classroomMode = value;
        app.cancelCheck();
        app.render();
      },
      'clap-navigation': ({ checked }) => {
        app.clapNavigation = checked;
        app.cancelCheck();
        app.render();
      },
      'change-class': ({ value }) => app.changeClass(value),
      advance: ({ checked }) => {
        app.db.settings.advance = checked;
        app.save();
      },
      'filter-roster': ({ value }) => {
        app.filter = value;
        app.renderCards();
      },
      'history-class': ({ value }) => {
        app.historyStudent = 'all';
        app.changeClass(value);
      },
      'history-student': ({ value }) => {
        app.historyStudent = value;
        app.render();
      },
      'import-backup': ({ event }) => app.importBackup(event),
    },
    input: {
      'target-slide': ({ element }) => {
        editTarget(element, 'slide');
      },
      'detection-slide': ({ element }) => {
        editDetection(element);
        app.saveDetectionSetting();
      },
      search: ({ value }) => {
        app.search = value;
        app.renderCards();
      },
    },
    submit: {
      'session-defaults': () => app.saveSessionDefaults(),
      'create-session': () => app.createSession(),
      settings: () => app.saveSettings(),
      'new-students': () => app.saveNewStudents(),
      'session-notes': () => {
        app.remember();
        app.ses()!.note = $('snote').value;
        app.save();
        app.closeDialog();
      },
      'student-notes': ({ data }) => {
        app.remember();
        app.ses()!.notes[data.id!] = $('pnote').value;
        app.save();
        app.closeDialog();
        app.render();
      },
      'edit-attempt': ({ data }) =>
        app.applyAttemptEdit(data.sessionId!, data.id!),
      class: ({ data }) => app.saveClass(data.rename === 'true'),
      student: ({ data }) => app.saveStudent(data.id!),
    },
  };
}
