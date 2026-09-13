import { findElement } from './helpers';

/** Shared by full renders and audio telemetry; never rebuild the live tuner. */
export function updateMicrophoneIndicator(
  mic: boolean,
  paused: boolean,
  status: string,
): void {
  const element = findElement('inputStatus');
  if (!element) return;
  const state = !mic
    ? 'off'
    : paused
      ? 'paused'
      : status === 'Waiting for a pause'
        ? 'waiting'
        : 'on';
  const label =
    state === 'waiting'
      ? 'Microphone waiting for a pause'
      : `Microphone ${state}`;
  if (element.dataset.microphone === state) return;
  element.dataset.microphone = state;
  element.setAttribute('aria-label', label);
  element.title = label;
}
