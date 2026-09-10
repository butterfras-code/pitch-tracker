/** Coordinates roster and settings forms with validation and persistence. */
import type { TrackerData } from '../domain/tracker';
import { errorMessage } from '../ui/helpers';
import type { App } from './application';
import { validateBackup as validate } from '../domain/backup';
import { uid } from '../domain/identity';
import { parseNote } from '../domain/pitch';
import { $ } from '../ui/helpers';

export const rosterController = {
  saveClass(this: App, rename: boolean): void {
    const name = $('className').value.trim();
    if (!name) return;
    if (rename) this.cls().name = name;
    else {
      this.stopMic();
      const c = { id: uid(), name, students: [] };
      this.db.classes.push(c);
      this.db.classId = c.id;
      this.db.activeSession = null;
      this.db.activeStudent = null;
      this.undoStack = [];
    }
    this.save();
    this.closeDialog();
    this.render();
  },
  saveNewStudents(this: App): void {
    const lines = $('rosterInput')
        .value.split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      added = [];
    try {
      if (!lines.length) throw Error('Enter at least one student.');
      for (const [i, l] of lines.entries()) {
        const cut = l.lastIndexOf(','),
          name = l.slice(0, cut).trim(),
          inst = l.slice(cut + 1).trim();
        const instrument = Object.keys(this.db.configs).find(
          (n) => n.toLowerCase() === inst.toLowerCase(),
        );
        if (cut < 1 || !name || name.length > 120 || !instrument)
          throw Error(
            'Line ' +
              (i + 1) +
              ': use Name, Instrument with a configured instrument.',
          );
        added.push({ id: uid(), name, instrument, archived: false });
      }
      this.cls().students.push(...added);
      this.save();
      this.closeDialog();
      this.render();
      this.toast(added.length + ' students added for future sessions.');
    } catch (e) {
      $('rosterError').textContent = errorMessage(e);
    }
  },
  saveStudent(this: App, id: string): void {
    const name = $('studentName').value.trim();
    if (!name) return;
    Object.assign(
      this.cls().students.find((p) => p.id === id)!,
      { name, instrument: $('studentInstrument').value },
    );
    this.save();
    this.closeDialog();
    this.render();
  },
  archiveStudent(this: App, id: string): void {
    const p = this.cls().students.find((p) => p.id === id);
    if (!p) return;
    p.archived = !p.archived;
    this.save();
    this.render();
  },
  addInstrument(this: App): void {
    const name = prompt('Instrument name (save any pending settings first):');
    if (!name?.trim()) return;
    const n = name.trim();
    if (
      n.length > 120 ||
      ['__proto__', 'constructor', 'prototype'].includes(n) ||
      Object.keys(this.db.configs).some(
        (k) => k.toLowerCase() === n.toLowerCase(),
      )
    ) {
      this.toast('Use a unique instrument name.');
      return;
    }
    this.db.configs[n] = { pitch: 'C', min: -25, max: 25 };
    this.save();
    this.render();
  },
  saveSettings(this: App): void {
    try {
      const configs: TrackerData['configs'] = {};
      document
        .querySelectorAll<HTMLTableRowElement>('#configTable tbody tr')
        .forEach((row) => {
          const pitch = row
              .querySelector<HTMLInputElement>('.pitch')!
              .value.trim(),
            min = +row.querySelector<HTMLInputElement>('.min')!.value,
            max = +row.querySelector<HTMLInputElement>('.max')!.value;
          parseNote(pitch);
          if (min > max)
            throw Error(
              row.dataset.instrument + ': minimum must be ≤ maximum.',
            );
          configs[row.dataset.instrument!] = { pitch, min, max };
        });
      const settings = {
        ...this.db.settings,
        a4: +$('a4').value,
        hold: +$('hold').value,
        stability: +$('stability').value,
        gate: +$('gate').value,
      };
      validate({ ...this.db, configs, settings });
      this.cancelCheck();
      this.db.configs = configs;
      this.db.settings = settings;
      this.save();
      this.toast(
        'Pitch settings saved. Existing measurements keep their original targets.',
      );
    } catch (e) {
      $('settingsError').textContent = errorMessage(e);
    }
  },
};
