import { rangeValue, setSettingsDirty } from '../ui/pitch-settings';
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
    const form = document.querySelector<HTMLFormElement>(
      '[data-ui-submit="settings"]',
    );
    if (form?.dataset.dirty === 'true') {
      this.toast(
        'Save or revert the current instrument before adding another.',
      );
      return;
    }
    const name = prompt('Instrument name:');
    if (!name?.trim()) return;
    const n = name.trim();
    if (
      n.length > 120 ||
      ['__proto__', 'constructor', 'prototype'].includes(n) ||
      Object.keys(this.db.configs).some(
        (instrument) => instrument.toLowerCase() === n.toLowerCase(),
      ) ||
      Array.from(document.querySelectorAll('#configTable tbody tr')).some(
        (row) =>
          (row as HTMLElement).dataset.instrument!.toLowerCase() ===
          n.toLowerCase(),
      )
    ) {
      this.toast('Use a unique instrument name.');
      return;
    }
    const select = document.querySelector<HTMLSelectElement>(
      '[data-ui-change="settings-instrument"]',
    )!;
    select.insertAdjacentHTML('beforeend', `<option selected>${n}</option>`);
    select.value = n;
    this.settingsInstrument = n;
    document.querySelector('#configTable tbody')!.innerHTML = targetRow(
      n,
      { pitch: 'C', min: -25, max: 25 },
      this.db.settings.a4,
    );
    setSettingsDirty(true);
    this.toast(`${n} added to the settings draft.`);
  },
  deleteInstrument(this: App): void {
    const name = this.settingsInstrument;
    if (!name) return;
    const used = this.db.classes.some((c) =>
      c.students.some((student) => student.instrument === name),
    );
    if (used) {
      this.toast(
        `${name} cannot be deleted while it is assigned to a student.`,
      );
      return;
    }
    const isPersisted = Object.hasOwn(this.db.configs, name);
    if (isPersisted && !confirm(`Delete ${name}? This cannot be undone.`))
      return;
    if (isPersisted) {
      const previous = this.db.configs[name];
      delete this.db.configs[name];
      if (!this.save()) {
        this.db.configs[name] = previous;
        this.toast(`${name} could not be deleted.`);
        return;
      }
    }
    this.settingsInstrument = Object.keys(this.db.configs)[0] ?? '';
    this.render();
    this.toast(`${name} deleted.`);
  },
  discardSettings(this: App): void {
    const form = document.querySelector<HTMLFormElement>(
      '[data-ui-submit="settings"]',
    );
    if (form?.dataset.dirty !== 'true') return;
    if (!confirm('Discard unsaved pitch and detection changes?')) return;
    this.render();
    this.toast('Unsaved settings discarded.');
  },
  selectSettingsSection(this: App, section: string): void {
    if (!['instruments', 'detection', 'defaults'].includes(section)) return;
    const form = document.querySelector<HTMLFormElement>(
      '[data-ui-submit="settings"]',
    );
    if (
      form?.dataset.dirty === 'true' &&
      !confirm('Continue without saving your instrument changes?')
    )
      return;
    this.settingsSection = section as App['settingsSection'];
    this.render();
  },
  selectSettingsInstrument(this: App, name: string): void {
    const select = document.querySelector<HTMLSelectElement>(
      '[data-ui-change="settings-instrument"]',
    );
    const form = document.querySelector<HTMLFormElement>(
      '[data-ui-submit="settings"]',
    );
    if (
      form?.dataset.dirty === 'true' &&
      !confirm('Switch instruments without saving your changes?')
    ) {
      if (select) select.value = this.settingsInstrument;
      return;
    }
    if (!Object.hasOwn(this.db.configs, name)) return;
    this.settingsInstrument = name;
    this.render();
  },
  saveDetectionSetting(this: App): void {
    const settings = {
      ...this.db.settings,
      a4: rangeValue($('a4')),
      hold: rangeValue($('hold')),
      stability: rangeValue($('stability')),
      gate: rangeValue($('gate')),
    };
    const previous = this.db.settings;
    this.db.settings = settings;
    if (!this.save()) {
      this.db.settings = previous;
      this.toast('Detection settings could not be saved.');
    }
  },
  resetPitchTargets(this: App): void {
    if (!confirm('Reset every pitch target to the band defaults?')) return;
    document.querySelector('#configTable tbody')!.innerHTML = Object.entries(
      defaultPitchTargets(),
    )
      .map(([name, config]) => targetRow(name, config, this.db.settings.a4))
      .join('');
    $('settingsError').textContent = '';
    setSettingsDirty(true);
    this.toast('Pitch target defaults loaded. Save settings to apply them.');
  },
  saveSettings(this: App): void {
    try {
      const configs: TrackerData['configs'] = { ...this.db.configs };
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
      const settings = this.db.settings;
      const upgraded = migrateToV2(this.db);
      validate({ ...upgraded, configs, settings });
      const previous = this.db;
      const candidate = { ...upgraded, configs, settings };
      this.cancelCheck();
      this.db = candidate;
      $('settingsError').textContent = '';
      if (!this.save()) {
        this.db = previous;
        $('settingsError').textContent =
          'Settings could not be saved. Your previous settings are unchanged.';
        return;
      }
      setSettingsDirty(false);
      this.toast(
        'Pitch settings saved. Existing measurements keep their original targets.',
      );
    } catch (e) {
      $('settingsError').textContent = errorMessage(e);
    }
  },
};
