/** Delegated callbacks resolve current application state on every invocation. */
import { isPitchStatus } from '../domain/pitch';
import type { App } from '../app/application';
import type { UiBindings } from './events';
import { $, download } from './helpers';

export function createBindings(app: App): UiBindings {
  return {
    click: {
      backup: () => app.backup(),
      'session-notes': () => app.sessionNotes(),
      'end-session': () => app.endSession(),
      'new-session': () => app.newSession(),
      undo: () => app.undo(),
      'toggle-mic': () => app.toggleMic(),
      'reference-tone': () => app.referenceTone(),
      'start-check': () => app.startCheck(),
      'close-dialog': () => app.closeDialog(),
      'add-students': () => app.addStudent(),
      'add-instrument': () => app.addInstrument(),
      'toggle-focus': () => {
        app.focusMode = !app.focusMode;
        app.render();
      },
      'cancel-check': () => {
        app.cancelCheck();
        app.render();
      },
      'next-student': () => app.pickNext(false),
      'random-student': () => app.pickNext(true),
      'active-student-notes': () => app.studentDetail(app.db.activeStudent),
      record: ({ data }) => {
        if (isPitchStatus(data.status)) app.record(data.status, data.id);
      },
      'select-student': ({ data }) => app.selectStudent(data.id!),
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
    },
    change: {
      'change-class': ({ value }) => app.changeClass(value),
      advance: ({ checked }) => {
        app.db.settings.advance = checked;
        app.save();
      },
      'filter-roster': ({ value }) => {
        app.filter = value;
        app.renderCards();
      },
      attendance: ({ data, checked }) => app.attendance(data.id!, checked),
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
      search: ({ value }) => {
        app.search = value;
        app.renderCards();
      },
    },
    submit: {
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
