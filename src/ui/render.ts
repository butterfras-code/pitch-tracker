/** Selects the current view and displays save warnings and transient feedback. */
import { $ } from './helpers';
import type { App } from '../app/application';
export const render = {
  render(this: App): void {
    document
      .querySelectorAll<HTMLElement>('[data-tab]')
      .forEach((b) =>
        b.classList.toggle(
          'on',
          b.dataset.tab === this.tab ||
            (b.dataset.tab === 'classes' &&
              (this.tab === 'admin' || this.tab === 'session')),
        ),
      );
    document.body.classList.toggle(
      'session-active',
      this.tab === 'session' && !!this.ses(),
    );
    document.body.classList.toggle(
      'admin-active',
      this.tab === 'admin' || this.tab === 'settings',
    );
    if (this.tab === 'session' && this.ses()) {
      this.renderClassroom();
      return;
    }
    this.pitchFeedback.clear();
    $('main').classList.toggle(
      'focus-mode',
      this.focusMode && this.tab === 'session',
    );
    $('main').innerHTML =
      this.tab === 'classes'
        ? this.sessionHTML()
        : this.tab === 'history'
          ? this.historyHTML()
          : this.tab === 'admin'
            ? this.adminHTML()
            : this.tab === 'settings'
              ? this.settingsHTML()
              : this.helpHTML();
    if (this.tab === 'session') this.renderCards();
  },
  warning(this: App, message: string): void {
    $('storageWarning').textContent = message;
    $('storageWarning').classList.remove('hidden');
  },
  toast(this: App, t: string): void {
    $('toast').textContent = t;
    $('toast').classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => $('toast').classList.add('hidden'),
      3500,
    );
  },
};
