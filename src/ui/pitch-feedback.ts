import type { PitchStatus } from '../domain/pitch';
import { FEEDBACK_CATALOG } from '../themes/registry';
import { FeedbackPicker, resolveFeedback } from '../themes/feedback';
import { findElement, statusName } from './helpers';

/** Owns timed dialog/card feedback; attempts and scoring remain in the controller. */
export class PitchFeedback {
  private inlineElement: HTMLElement | null = null;
  private picker = new FeedbackPicker();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private element: HTMLDialogElement | null = null;
  private events: AbortController | null = null;

  get visible(): boolean {
    return !!this.inlineElement || (this.element?.open ?? false);
  }

  show(
    name: string,
    rating: PitchStatus,
    durationOverride?: number | null,
    host?: HTMLElement,
  ): void {
    this.clear();
    const element = host
      ? document.createElement('div')
      : findElement('pitchFeedback');
    if (!element) return;
    const themeId = document.documentElement.dataset.theme ?? '';
    const phrase = this.picker.next(
      resolveFeedback(FEEDBACK_CATALOG, themeId, rating),
    );
    const duration = durationOverride ?? FEEDBACK_CATALOG.defaults.durationMs;
    const caption = document.createElement('p');
    caption.id = 'feedbackCaption';
    caption.className = 'feedback-caption';
    caption.textContent = `${name} · ${statusName(rating)}`;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 64 64');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('feedback-icon');
    const path = document.createElementNS(icon.namespaceURI, 'path');
    path.setAttribute(
      'd',
      rating === 'correct'
        ? 'M14 32 26 44 50 20'
        : rating === 'low'
          ? 'M32 50V14M16 30 32 14 48 30'
          : 'M32 14V50M16 34 32 50 48 34',
    );
    icon.append(path);
    const message = document.createElement('h2');
    message.id = 'feedbackMessage';
    message.className = 'feedback-phrase';
    message.textContent = phrase;
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'feedback-continue';
    dismiss.textContent = 'Continue';
    dismiss.autofocus = !host;
    const hint = document.createElement('p');
    hint.className = 'feedback-hint';
    hint.textContent = `Closes automatically after ${duration / 1000} ${duration === 1000 ? 'second' : 'seconds'}`;
    element.replaceChildren(icon, caption, message, dismiss, hint);
    element.dataset.rating = rating;
    if (host) {
      element.className = 'card-feedback';
      element.setAttribute('role', 'status');
      host.append(element);
      this.inlineElement = element;
    } else if (element instanceof HTMLDialogElement) this.element = element;
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    dismiss.addEventListener('click', () => this.clear(), options);
    element.addEventListener(
      'cancel',
      (event) => {
        event.preventDefault();
        this.clear();
      },
      options,
    );
    if (element instanceof HTMLDialogElement) element.showModal();
    this.timer = setTimeout(() => this.clear(), duration);
  }

  clear(): void {
    this.inlineElement?.remove();
    this.inlineElement = null;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.events?.abort();
    this.events = null;
    if (this.element) {
      if (this.element.open) this.element.close();
      this.element.replaceChildren();
      delete this.element.dataset.rating;
    }
    this.element = null;
  }
}
