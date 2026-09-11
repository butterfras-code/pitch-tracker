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
  const symbol = treble
    ? '<path d="M30 91 C56 71 14 62 24 43 C43 15 45 7 38 9 C20 20 49 74 35 94 C26 103 20 91 29 89 M34 48 C12 51 16 79 37 77 C57 75 48 52 33 59 C24 63 26 70 31 70" fill="none" stroke-width="2.8"/>'
    : '<path d="M23 49 C24 35 48 36 46 51 C44 66 31 72 22 76 C38 63 42 50 36 45 C31 41 27 45 28 50" fill="none" stroke-width="3"/><circle cx="25" cy="49" r="4"/><circle cx="53" cy="45" r="2"/><circle cx="53" cy="55" r="2"/>';
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
  const scale =
    Math.max(
      Math.abs(offset),
      Math.abs(offset + config.min),
      Math.abs(offset + config.max),
    ) > 200
      ? 1200
      : 200;
  return `<tr data-instrument="${esc(name)}" data-clef="auto" data-scale="${scale}"><td><strong>${esc(name)}</strong><div class="note-selectors"><label>Note<select class="note-name" aria-label="${esc(name)} note" data-ui-change="target-note">${notes.map((note) => `<option ${note === base ? 'selected' : ''} value="${note}">${note.replace('#', '♯').replace('b', '♭')}</option>`).join('')}</select></label><label>Octave<select class="note-octave" aria-label="${esc(name)} octave" data-ui-change="target-note"><option value="" ${n.octave === null ? 'selected' : ''}>Any octave</option>${Array.from({ length: 9 }, (_, octave) => `<option ${n.octave === octave ? 'selected' : ''}>${octave}</option>`).join('')}</select></label></div><input type="hidden" class="pitch" value="${esc(config.pitch)}"><input type="hidden" class="min" value="${config.min}"><input type="hidden" class="max" value="${config.max}"><small class="octave-hint">${n.octave === null ? 'Staff and frequency preview use octave 4.' : 'Concert pitch'}</small></td><td class="staff-cell"><button type="button" class="clef-toggle" data-ui-click="target-clef" aria-label="${esc(name)} toggle clef">${staff(config.pitch, offset, 'auto')}</button><button type="button" class="clef-auto" data-ui-click="target-clef-auto">Auto clef</button></td><td class="target-editor"><div class="target-summary">${summary(config, a4)}</div><div class="pitch-sliders"><div class="accepted-band" style="left:${(offset + config.min + scale) / (scale / 50)}%;width:${(config.max - config.min) / (scale / 50)}%"></div>${(['min', 'target', 'max'] as const).map((kind, index) => `<span class="lane-label" style="top:${index * 34}px">${kind === 'target' ? 'Target' : kind === 'min' ? 'Min' : 'Max'}</span><input type="range" class="${kind === 'target' ? 'target-offset' : kind + '-slider'}" aria-label="${esc(name)} ${kind === 'target' ? 'target adjustment' : kind + 'imum pitch'}" aria-valuetext="${signed(kind === 'target' ? offset : config[kind])}" min="${-scale}" max="${scale}" step="1" value="${offset + (kind === 'target' ? 0 : config[kind])}" data-original-value="${offset + (kind === 'target' ? 0 : config[kind])}" data-handle="${kind}" data-ui-input="target-slide">`).join('')}</div><div class="pitch-ticks">${ticks(config.pitch, scale)}</div><div class="range-readouts">${readouts(config)}</div><div class="target-tools"><button type="button" data-ui-click="target-reset">Reset to note</button><label>Scale<select class="pitch-scale" aria-label="${esc(name)} pitch scale" data-ui-change="target-scale"><option value="200" ${scale === 200 ? 'selected' : ''}>Fine · ±200¢</option><option value="1200" ${scale === 1200 ? 'selected' : ''}>Wide · ±1200¢</option></select></label></div></td></tr>`;
}
function ticks(pitch: string, scale: number): string {
  const pc = parseNote(pitch).pc;
  return [-scale / 100, -scale / 200, 0, scale / 200, scale / 100]
    .map(
      (delta) =>
        `<span>${chromatic[(pc + delta + 12) % 12]}<small>${delta === 0 ? 'Selected' : `${delta > 0 ? '+' : ''}${delta * 100}¢`}</small></span>`,
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
    const fits =
      Math.max(
        Math.abs(offset),
        Math.abs(offset + config.min),
        Math.abs(offset + config.max),
      ) <= 200;
    row.dataset.scale =
      input(row, 'pitch-scale').value === '200' && fits ? '200' : '1200';
    input(row, 'pitch-scale').value = row.dataset.scale;
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
