/** Draft-only graphical controls; persistence remains with the settings controller. */
import { parseNote, targetFrequency, type PitchTarget } from '../domain/pitch';
import { esc } from './helpers';

const notes = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'Fb',
  'E#',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
  'Cb',
  'B#',
];
const chromatic = [
  'C',
  'C♯',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
];
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}¢`;
const input = (row: Element, cls: string) =>
  row.querySelector<HTMLInputElement>(`.${cls}`)!;
/** Preserve imported precision until a slider is explicitly edited. */
export function rangeValue(slider: HTMLInputElement): number {
  return +(slider.dataset.originalValue ?? slider.value);
}
function draft(row: Element): PitchTarget {
  return {
    pitch: input(row, 'pitch').value,
    offset: rangeValue(input(row, 'target-offset')),
    min: +input(row, 'min').value,
    max: +input(row, 'max').value,
  };
}

function staff(pitch: string, offset: number, clef: string): string {
  const parsed = parseNote(pitch);
  const midi = (parsed.midi ?? 60 + parsed.pc) + offset / 100;
  const nearest = Math.round(midi);
  const named =
    offset === 0
      ? pitch.replace(/[0-8]$/, '')
      : chromatic[((nearest % 12) + 12) % 12];
  const octave =
    offset === 0 ? (parsed.octave ?? 4) : Math.floor(nearest / 12) - 1;
  const treble = clef === 'auto' ? midi >= 60 : clef === 'treble';
  const step = octave * 7 + 'CDEFGAB'.indexOf(named[0]);
  const bottom = treble ? 4 * 7 + 2 : 2 * 7 + 4;
  const y = 80 - (step - bottom) * 5;
  const top = Math.min(15, y - 15),
    height = Math.max(110, y + 20) - top;
  let lines = '';
  for (let line = 40; line <= 80; line += 10)
    lines += `<path d="M8 ${line}H140"/>`;
  for (let line = 30; line >= y; line -= 10)
    lines += `<path d="M91 ${line}H117"/>`;
  for (let line = 90; line <= y; line += 10)
    lines += `<path d="M91 ${line}H117"/>`;
  // Clefs are local SVG paths so rendering never depends on music fonts.
  // Bravura U+E050 / U+E062 (SIL OFL); 10 units per staff space.
  // Origins sit on G4 for treble and F3 for bass.
  // See docs/licenses/Bravura.txt.
  const symbol = treble
    ? '<path d="M35.04 53.4C34.96 52.92 35.04 52.879999999999995 35.28 52.64C35.92 52.04 36.760000000000005 51.2 37.519999999999996 50.36C40.879999999999995 46.68 42.879999999999995 41.92 42.879999999999995 37.4C42.879999999999995 33.92 41.92 30.479999999999997 40.28 28.08C39.68 27.199999999999996 38.64 26.08 38.2 26.08C37.64 26.08 36.4 27.119999999999997 35.6 28.0C32.64 31.28 31.68 36.28 31.68 40.44C31.68 42.76 31.96 45.36 32.24 47.0C32.32 47.480000000000004 32.36 47.56 31.880000000000003 47.96C29.32 50.08 26.560000000000002 52.519999999999996 24.48 55.08C21.72 58.519999999999996 20.0 62.24 20.0 66.52C20.0 73.48 24.759999999999998 80.08 34.56 80.08C35.480000000000004 80.08 36.519999999999996 80.0 37.32 79.84C37.760000000000005 79.76 37.84 79.72 37.92 80.2C38.400000000000006 82.88 39.0 86.36 39.0 88.24000000000001C39.0 94.16 35.0 94.88 32.64 94.88C30.48 94.88 29.439999999999998 94.24000000000001 29.439999999999998 93.72C29.439999999999998 93.44 29.8 93.32 30.72 93.03999999999999C31.96 92.68 33.4 91.6 33.4 89.28C33.4 87.08 32.0 85.2 29.560000000000002 85.2C26.88 85.2 25.28 87.32 25.28 89.8C25.28 92.4 26.84 96.32 32.88 96.32C35.56 96.32 40.760000000000005 95.12 40.760000000000005 88.32C40.760000000000005 86.03999999999999 40.04 82.24 39.6 79.76C39.519999999999996 79.28 39.56 79.32 40.120000000000005 79.08C44.16 77.48 46.84 74.08 46.84 69.56C46.84 64.44 43.08 59.92 37.2 59.92C36.16 59.92 36.16 59.92 36.04 59.2ZM38.8 32.28C40.120000000000005 32.28 41.2 33.36 41.2 35.56C41.2 38.32 39.879999999999995 40.879999999999995 36.760000000000005 44.0C36.120000000000005 44.64 35.16 45.56 34.24 46.36C33.96 46.599999999999994 33.8 46.56 33.72 46.04C33.56 45.0 33.480000000000004 43.64 33.480000000000004 42.36C33.480000000000004 36.12 36.36 32.28 38.8 32.28ZM34.44 59.519999999999996C34.56 60.28 34.56 60.24 33.84 60.480000000000004C30.32 61.68 28.04 64.84 28.04 68.24C28.04 71.84 29.92 74.4 32.64 75.32C32.96 75.44 33.44 75.56 33.72 75.56C34.04 75.56 34.2 75.36 34.2 75.12C34.2 74.84 33.88 74.72 33.6 74.6C31.92 73.88 30.72 72.16 30.72 70.32C30.72 68.04 32.28 66.32 34.72 65.64C35.36 65.48 35.44 65.52 35.519999999999996 65.96L37.519999999999996 77.88C37.6 78.32 37.56 78.32 36.96 78.44C36.32 78.56 35.519999999999996 78.64 34.72 78.64C27.72 78.64 23.2 74.76 23.2 69.2C23.2 66.84 23.6 63.68 26.92 59.92C29.32 57.24 31.16 55.76 33.04 54.24C33.44 53.92 33.519999999999996 53.96 33.6 54.4ZM37.2 65.88C37.120000000000005 65.4 37.16 65.28 37.64 65.32C40.879999999999995 65.6 43.56 68.32 43.56 71.84C43.56 74.36 42.04 76.4 39.8 77.52C39.32 77.76 39.24 77.76 39.16 77.28Z" stroke="none"/>'
    : '<path d="M30.08 39.52C23.12 39.52 20 44.6 20 48.44C20 51.64 21.68 54.4 24.92 54.4C27.44 54.4 29.16 52.64 29.16 50.16C29.16 47.6 27.28 46 25.32 46C24.24 46 23.84 46.28 23.32 46.28C22.8 46.28 22.68 45.96 22.68 45.56C22.68 43.96 25.08 41.04 29.16 41.04C33.4 41.04 35.24 45.2 35.24 51.48C35.24 55.6 34.36 60.4 31.88 64.24C29.48 67.96 25.36 71.36 20.4 74.2C20.04 74.4 19.8 74.6 19.8 74.92C19.8 75.16 19.96 75.4 20.32 75.4C20.52 75.4 20.76 75.32 21 75.2C26.32 72.6 31.44 69.56 35.68 65C39.16 61.24 41.24 56.36 41.24 51.12C41.24 44.16 37 39.52 30.08 39.52ZM45.16 42.8C43.92 42.8 42.96 43.76 42.96 45C42.96 46.24 43.92 47.2 45.16 47.2C46.4 47.2 47.36 46.24 47.36 45C47.36 43.76 46.4 42.8 45.16 42.8ZM45.2 52.84C43.96 52.84 43.04 53.76 43.04 55C43.04 56.24 43.96 57.16 45.2 57.16C46.44 57.16 47.36 56.24 47.36 55C47.36 53.76 46.44 52.84 45.2 52.84Z" stroke="none"/>';
  const accidental = named.slice(1).replace('#', '♯').replace('b', '♭');
  return `<svg class="pitch-staff" viewBox="0 ${top} 150 ${height}" role="img" aria-label="${treble ? 'Treble' : 'Bass'} clef, ${esc(named)}${octave}${parsed.octave === null ? ', preview octave 4' : ''}"><g stroke="currentColor" fill="currentColor">${lines}${symbol}<ellipse cx="104" cy="${y}" rx="7" ry="4.5" transform="rotate(-20 104 ${y})"/><path d="M${y < 60 ? 97 : 111} ${y}v${y < 60 ? 30 : -30}"/></g><text x="78" y="${y + 5}" fill="currentColor" font-size="20">${accidental}</text></svg><span>${treble ? 'Treble' : 'Bass'} · ${clef === 'auto' ? 'Auto' : 'Manual'}</span>`;
}

export function targetRow(
  name: string,
  config: PitchTarget,
  a4: number,
): string {
  const n = parseNote(config.pitch),
    base = config.pitch
      .trim()
      .replace(/[0-8]$/, '')
      .replace('♯', '#')
      .replace('♭', 'b');
  const offset = config.offset ?? 0;
  const extent = Math.max(
    Math.abs(offset),
    Math.abs(offset + config.min),
    Math.abs(offset + config.max),
  );
  const scale = extent > 200 ? Math.ceil(extent) : extent > 100 ? 200 : 100;
  return `<tr data-instrument="${esc(name)}" data-clef="auto" data-scale="${scale}"><td><strong>${esc(name)}</strong><div class="note-selectors"><label>Note<select class="note-name" aria-label="${esc(name)} note" data-ui-change="target-note">${notes.map((note) => `<option ${note === base ? 'selected' : ''} value="${note}">${note.replace('#', '♯').replace('b', '♭')}</option>`).join('')}</select></label><label>Octave<select class="note-octave" aria-label="${esc(name)} octave" data-ui-change="target-note"><option value="" ${n.octave === null ? 'selected' : ''}>Any octave</option>${Array.from({ length: 9 }, (_, octave) => `<option ${n.octave === octave ? 'selected' : ''}>${octave}</option>`).join('')}</select></label></div><input type="hidden" class="pitch" value="${esc(config.pitch)}"><input type="hidden" class="min" value="${config.min}"><input type="hidden" class="max" value="${config.max}"><small class="octave-hint">${n.octave === null ? 'Staff and frequency preview use octave 4.' : 'Concert pitch'}</small></td><td class="staff-cell"><button type="button" class="clef-toggle" data-ui-click="target-clef" aria-label="${esc(name)} toggle clef">${staff(config.pitch, offset, 'auto')}</button><button type="button" class="clef-auto" data-ui-click="target-clef-auto">Auto clef</button></td><td class="target-editor"><div class="target-summary">${summary(config, a4)}</div><div class="pitch-sliders"><div class="accepted-band" style="left:${(offset + config.min + scale) / (scale / 50)}%;width:${(config.max - config.min) / (scale / 50)}%"></div>${(['min', 'target', 'max'] as const).map((kind) => `<input type="range" class="${kind === 'target' ? 'target-offset' : kind + '-slider'}" aria-label="${esc(name)} ${kind === 'target' ? 'target adjustment' : kind + 'imum pitch'}" aria-valuetext="${signed(kind === 'target' ? offset : config[kind])}" min="${-scale}" max="${scale}" step="1" value="${offset + (kind === 'target' ? 0 : config[kind])}" data-original-value="${offset + (kind === 'target' ? 0 : config[kind])}" data-handle="${kind}" data-ui-input="target-slide">`).join('')}</div><div class="pitch-ticks">${ticks(config.pitch, scale)}</div><div class="range-readouts">${readouts(config)}</div><div class="target-tools"><button type="button" data-ui-click="target-reset">Reset to note</button><label>Scale<select class="pitch-scale" aria-label="${esc(name)} pitch scale" data-ui-change="target-scale">${[50, 100, 200, ...(scale > 200 ? [scale] : [])].map((value) => `<option value="${value}" ${scale === value ? 'selected' : ''}>${value === 50 ? 'Fine' : value === 100 ? 'Normal' : value === 200 ? 'Wide' : 'Saved range'} · ±${value}¢</option>`).join('')}</select></label></div></td></tr>`;
}
function ticks(pitch: string, scale: number): string {
  const pc = parseNote(pitch).pc;
  return [-scale / 100, -scale / 200, 0, scale / 200, scale / 100]
    .map(
      (delta) =>
        `<span>${Number.isInteger(delta) ? chromatic[(((pc + delta) % 12) + 12) % 12] : ''}<small>${delta === 0 ? 'Selected' : `${delta > 0 ? '+' : ''}${delta * 100}¢`}</small></span>`,
    )
    .join('');
}
function summary(config: PitchTarget, a4: number): string {
  const offset = config.offset ?? 0;
  const nearest = Math.round(offset / 100) * 100;
  const custom = offset !== nearest;
  const pc = (parseNote(config.pitch).pc + Math.round(offset / 100) + 12) % 12;
  return `<strong class="${custom ? 'custom-pitch' : ''}">${custom ? 'Custom · ' : ''}${esc(config.pitch)} ${offset ? signed(offset) : ''}</strong><span>${targetFrequency(config, a4).toFixed(2)} Hz${custom ? ` · ${signed(offset - nearest)} from ${chromatic[pc]}` : ' · On pitch'}</span>`;
}
function readouts(config: PitchTarget): string {
  return `<span>Min <b>${signed(config.min)}</b></span><span>Target <b>${signed(config.offset ?? 0)}</b></span><span>Max <b>${signed(config.max)}</b></span>`;
}
function refresh(row: HTMLElement): void {
  const config = draft(row),
    offset = config.offset ?? 0;
  const scale = +row.dataset.scale!;
  const a4 = rangeValue(document.querySelector<HTMLInputElement>('#a4')!);
  row.querySelector('.target-summary')!.innerHTML = summary(config, a4);
  row.querySelector('.range-readouts')!.innerHTML = readouts(config);
  row.querySelector('.pitch-ticks')!.innerHTML = ticks(config.pitch, scale);
  row.querySelector('.clef-toggle')!.innerHTML = staff(
    config.pitch,
    offset,
    row.dataset.clef!,
  );
  row.querySelector('.octave-hint')!.textContent =
    parseNote(config.pitch).octave === null
      ? 'Staff and frequency preview use octave 4.'
      : 'Concert pitch';
  const band = row.querySelector<HTMLElement>('.accepted-band')!;
  band.style.left = `${(offset + config.min + scale) / (scale / 50)}%`;
  band.style.width = `${(config.max - config.min) / (scale / 50)}%`;
  for (const kind of ['min', 'target', 'max'] as const) {
    const slider = input(
      row,
      kind === 'target' ? 'target-offset' : kind + '-slider',
    );
    slider.min = String(-scale);
    slider.max = String(scale);
    slider.dataset.originalValue = String(
      offset + (kind === 'target' ? 0 : config[kind]),
    );
    slider.value = String(offset + (kind === 'target' ? 0 : config[kind]));
    slider.setAttribute(
      'aria-valuetext',
      kind === 'target'
        ? `${config.pitch} ${signed(offset)}`
        : `${signed(config[kind])} relative to target`,
    );
  }
}
export function editTarget(
  element: HTMLElement,
  action: 'note' | 'slide' | 'reset' | 'clef' | 'auto' | 'scale',
): void {
  const row = element.closest<HTMLTableRowElement>('tr')!;
  if (action === 'slide') delete element.dataset.originalValue;
  if (action === 'note' || action === 'reset')
    delete input(row, 'target-offset').dataset.originalValue;
  if (action === 'scale') {
    const config = draft(row),
      offset = config.offset ?? 0;
    const extent = Math.max(
      Math.abs(offset),
      Math.abs(offset + config.min),
      Math.abs(offset + config.max),
    );
    const requested = +input(row, 'pitch-scale').value;
    if (extent <= requested) row.dataset.scale = String(requested);
    input(row, 'pitch-scale').value = row.dataset.scale!;
  } else if (action === 'note') {
    input(row, 'pitch').value =
      input(row, 'note-name').value + input(row, 'note-octave').value;
    input(row, 'target-offset').value = '0';
  } else if (action === 'reset') input(row, 'target-offset').value = '0';
  else if (action === 'slide') {
    const config = draft(row);
    const kind = element.dataset.handle;
    if (kind === 'target')
      input(row, 'target-offset').value = String(
        Math.max(
          -600,
          -Number(row.dataset.scale) - Math.min(0, config.min),
          Math.min(
            600,
            Number(row.dataset.scale) - Math.max(0, config.max),
            config.offset!,
          ),
        ),
      );
    else {
      const value = +(element as HTMLInputElement).value - config.offset!;
      input(row, kind!).value = String(
        kind === 'min'
          ? Math.max(-600, Math.min(0, config.max, value))
          : Math.min(600, Math.max(0, config.min, value)),
      );
    }
  } else if (action === 'auto') row.dataset.clef = 'auto';
  else {
    const config = draft(row),
      note = parseNote(config.pitch);
    const current =
      row.dataset.clef === 'auto'
        ? (note.midi ?? 60 + note.pc) + config.offset! / 100 >= 60
          ? 'treble'
          : 'bass'
        : row.dataset.clef;
    row.dataset.clef = current === 'treble' ? 'bass' : 'treble';
  }
  refresh(row);
}

export function detectionSlider(
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  low: string,
  high: string,
): string {
  return `<div class="detection-control"><label for="${id}">${label}</label><output for="${id}">${value} ${unit}</output><input id="${id}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${value} ${unit}" data-original-value="${value}" data-unit="${unit}" data-ui-input="detection-slide"><span class="slider-endpoints"><span>${low}</span><span>${high}</span></span></div>`;
}
export function editDetection(element: HTMLElement): void {
  const slider = element as HTMLInputElement;
  delete slider.dataset.originalValue;
  slider.closest('.detection-control')!.querySelector('output')!.textContent =
    `${slider.value} ${slider.dataset.unit}`;
  slider.setAttribute(
    'aria-valuetext',
    `${slider.value} ${slider.dataset.unit}`,
  );
  if (slider.id === 'a4')
    document
      .querySelectorAll<HTMLTableRowElement>('#configTable tbody tr')
      .forEach(refresh);
}
