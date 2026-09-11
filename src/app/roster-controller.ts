import { rangeValue } from '../ui/pitch-settings';
import { migrateToV2 } from '../domain/backup';
/** Coordinates roster and settings forms with validation and persistence. */
import type { TrackerData } from '../domain/tracker';
import { errorMessage } from '../ui/helpers';
import type { App } from './application';
import { validateBackup as validate } from '../domain/backup';
import { uid } from '../domain/identity';
import { parseNote } from '../domain/pitch';
import { defaultPitchTargets } from '../domain/defaults';
import { targetRow } from '../ui/pitch-settings';
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
      const all = /^ALL:/i.test(lines[0]);
      const shared = all
        ? Object.keys(this.db.configs).find(
            (n) => n.toLowerCase() === lines[0].slice(4).trim().toLowerCase(),
          )
        : undefined;
      if (all && !shared)
        throw Error(
          'Line 1: use ALL: Instrument with a configured instrument.',
        );
      const entries = all ? lines.slice(1) : lines;
      if (!entries.length)
        throw Error('Enter at least one student after ALL: Instrument.');
      for (const [i, l] of entries.entries()) {
        const cut = l.lastIndexOf(','),
          name = all ? l : l.slice(0, cut).trim(),
          inst = l.slice(cut + 1).trim();
        const instrument =
          shared ||
          Object.keys(this.db.configs).find(
            (n) => n.toLowerCase() === inst.toLowerCase(),
          );
        if ((!all && cut < 1) || !name || name.length > 120 || !instrument)
          throw Error(
            'Line ' +
              (i + 1 + (all ? 1 : 0)) +
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
  deleteStudent(this: App, id: string): void {
    const c = this.cls(),
      p = c.students.find((p) => p.id === id);
    if (
      !p ||
      !confirm(
        'Delete ' +
          p.name +
          ' from ' +
          c.name +
          '? This cannot be undone. Existing sessions and history will be kept.',
      )
    )
      return;
    c.students = c.students.filter((p) => p.id !== id);
    this.save();
    this.render();
    this.toast(p.name + ' deleted from class.');
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
  resetPitchTargets(this: App): void {
    if (!confirm('Reset every pitch target to the band defaults?')) return;
    document.querySelector('#configTable tbody')!.innerHTML = Object.entries(
      defaultPitchTargets(),
    )
      .map(([name, config]) => targetRow(name, config, this.db.settings.a4))
      .join('');
    $('settingsError').textContent = '';
    this.toast('Pitch target defaults loaded. Save settings to apply them.');
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
          const offset = rangeValue(
            row.querySelector<HTMLInputElement>('.target-offset')!,
          );
          configs[row.dataset.instrument!] = { pitch, min, max, offset };
        });
      const settings = {
        ...this.db.settings,
        a4: rangeValue($('a4')),
        hold: rangeValue($('hold')),
        stability: rangeValue($('stability')),
        gate: rangeValue($('gate')),
      };
      const upgraded = migrateToV2(this.db);
      validate({ ...upgraded, configs, settings });
      this.cancelCheck();
      this.db = { ...upgraded, configs, settings };
      $('settingsError').textContent = '';
      if (this.save())
        this.toast(
          'Pitch settings saved. Existing measurements keep their original targets.',
        );
    } catch (e) {
      $('settingsError').textContent = errorMessage(e);
    }
  },
};
