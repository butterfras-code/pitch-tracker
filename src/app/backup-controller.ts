import { targetLabel } from '../domain/pitch';
/** Coordinates downloads, restore, and storage failure feedback. */
import { errorMessage } from '../ui/helpers';
import type { App } from './application';
import { validateBackup as validate } from '../domain/backup';
import { StorageConflictError } from '../persistence/tracker-store';
import { $, csvCell, download } from '../ui/helpers';

export const backupController = {
  save(this: App): boolean {
    if (this.storageBlocked) {
      $('saveStatus').textContent = 'Not saved \u00b7 export needed';
      return false;
    }
    try {
      this.trackerStore.save(this.db);
      $('saveStatus').textContent =
        'Saved on this browser \u00b7 ' +
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      return true;
    } catch (e) {
      this.storageBlocked = true;
      if (e instanceof StorageConflictError) {
        this.warning(
          'Another window changed this tracker. Saving is paused to avoid overwriting it. Back up this window, then reload to use the latest saved data.',
        );
      } else {
        this.warning(
          'Browser storage is unavailable or full. Your current work is still open. Download a backup before closing.',
        );
      }
      $('saveStatus').textContent = 'Not saved \u00b7 export needed';
      return false;
    }
  },
  backup(this: App): void {
    this.db.lastBackup = Date.now();
    this.save();
    download(
      JSON.stringify(this.db, null, 2),
      'pitch-tracker-backup-' + new Date().toISOString().slice(0, 10) + '.json',
      'application/json',
    );
    this.toast('Backup download requested. Keep it somewhere safe.');
  },
  exportCSV(this: App, sid?: string): void {
    const ss = this.db.sessions.filter((s) =>
      sid ? s.id === sid : s.classId === this.db.classId,
    );
    const rows: (string | number | null | undefined)[][] = [
      [
        'Class',
        'Session',
        'Started',
        'Student',
        'Instrument',
        'Attendance',
        'Attempt time',
        'Result',
        'Source',
        'Hz',
        'Cents',
        'Target',
        'Min cents',
        'Max cents',
        'A4 Hz',
        'Student notes',
        'Session notes',
      ],
    ];
    for (const s of ss)
      for (const p of s.roster) {
        if (this.historyStudent !== 'all' && p.id !== this.historyStudent)
          continue;
        const a = s.attempts.filter((a) => a.studentId === p.id);
        for (const x of a.length ? a : [null])
          rows.push([
            s.className,
            s.name,
            new Date(s.started).toISOString(),
            x?.name || p.name,
            x?.instrument || p.instrument,
            s.absent.includes(p.id) ? 'Absent' : 'Present',
            x ? new Date(x.time).toISOString() : '',
            x?.status,
            x?.source,
            x?.frequency,
            x?.cents,
            x ? targetLabel(x.target) : undefined,
            x?.target.min,
            x?.target.max,
            x?.a4,
            s.notes[p.id] || '',
            s.note,
          ]);
      }
    download(
      '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'),
      'pitch-tracker-results.csv',
      'text/csv;charset=utf-8',
    );
  },
  async importBackup(this: App, e: Event): Promise<void> {
    if (!(e.target instanceof HTMLInputElement)) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024)
        throw Error('Backup is larger than the 30 MB import limit.');
      const incoming = validate(JSON.parse(await file.text()));
      if (
        !confirm(
          `Replace all current data with ${incoming.classes.length} classes and ${incoming.sessions.length} sessions from this backup? Download your current backup first if needed.`,
        )
      )
        return;
      const restored = this.trackerStore.restore(incoming);
      this.stopMic();
      this.db = restored;
      this.applySessionDefaults();
      this.resetRound();
      this.storageBlocked = false;
      this.loadedRaw = JSON.stringify(this.db);
      $('storageWarning').classList.add('hidden');
      $('saveStatus').textContent = 'Backup restored · saved on this browser';
      this.undoStack = [];
      this.historyStudent = 'all';
      this.closeDialogIfOpen();
      this.render();
      this.toast('Backup restored.');
    } catch (err) {
      this.toast('Restore failed: ' + errorMessage(err));
    }
  },
};
