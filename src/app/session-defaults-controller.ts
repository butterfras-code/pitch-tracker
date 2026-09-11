import type { App } from './application';
import { migrateToV3, validateBackup } from '../domain/backup';
import { errorMessage } from '../ui/helpers';

export const sessionDefaultsController = {
  applySessionDefaults(this: App): void {
    if (this.db.schema !== 3 || !this.db.sessionDefaults) return;
    const defaults = this.db.sessionDefaults;
    this.cancelCheck();
    this.db.settings.advance = defaults.advance;
    this.classroomMode = defaults.mode;
    this.clapNavigation = defaults.claps;
    this.classroomPaused = false;
    this.workspace?.dispose();
    this.workspace = null;
  },
  saveSessionDefaults(this: App): void {
    const form = document.querySelector<HTMLFormElement>(
      '[data-ui-submit="session-defaults"]',
    )!;
    const error = document.getElementById('sessionDefaultsError')!;
    try {
      const values = new FormData(form);
      const next = migrateToV3(this.db);
      const candidate = validateBackup({
        ...next,
        sessionDefaults: {
          advance: values.has('advance'),
          mode: values.get('mode'),
          claps: values.has('claps'),
          teacher: values.has('teacher'),
          view: values.get('view'),
        },
      });
      const previous = this.db;
      this.db = candidate;
      if (!this.save()) {
        this.db = previous;
        error.textContent =
          'Session defaults could not be saved. Your previous defaults are unchanged.';
        return;
      }
      error.textContent = '';
      this.toast(
        'Session defaults saved for starting, resuming, or reopening sessions.',
      );
    } catch (e) {
      error.textContent = errorMessage(e);
    }
  },
};
