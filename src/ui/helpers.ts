/** Escaping, typed DOM access, and display/download formatting. */
import type { Attempt, Session } from '../domain/tracker';
interface Elements {
  themeSelect: HTMLSelectElement;
  modal: HTMLDialogElement;
  importFile: HTMLInputElement;
  className: HTMLInputElement;
  studentName: HTMLInputElement;
  studentInstrument: HTMLSelectElement;
  editResult: HTMLSelectElement;
  rosterInput: HTMLTextAreaElement;
  snote: HTMLTextAreaElement;
  pnote: HTMLTextAreaElement;
  a4: HTMLInputElement;
  hold: HTMLInputElement;
  stability: HTMLInputElement;
  gate: HTMLInputElement;
}
export function $<K extends keyof Elements>(id: K): Elements[K];
export function $(id: string): HTMLElement;
export function $(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing UI element: ' + id);
  return element;
}
export const findElement = (id: string): HTMLElement | null =>
  document.getElementById(id);
export const esc = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export const rate = (a: Attempt[]): string =>
  a.length
    ? Math.round(a.filter((x) => x.status === 'correct').length / a.length) +
      '%'
    : '—';
export const options = (arr: string[], value: string): string =>
  arr
    .map(
      (x) =>
        `<option value="${esc(x)}" ${x === value ? 'selected' : ''}>${esc(x)}</option>`,
    )
    .join('');
export const statusName = (status?: string): string =>
  ({ low: 'Too low', correct: 'In range', high: 'Too high' })[status ?? ''] ||
  'Not tested';
export const stamp = (date: number): string => new Date(date).toLocaleString();
export function elapsed(s: Session): string {
  const sec = Math.floor((Date.now() - s.started) / 1000);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
export function download(content: BlobPart, name: string, type: string): void {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function csvCell(value: unknown): string {
  let s = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export const noteNames = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
