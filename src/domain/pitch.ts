export interface ParsedNote {
  pc: number;
  octave: number | null;
  midi: number | null;
}
export interface PitchTarget {
  pitch: string;
  min: number;
  max: number;
}
export type PitchStatus = 'low' | 'correct' | 'high';
export interface PitchMeasurement {
  cents: number;
  status: PitchStatus;
  frequency: number;
}
const NOTE_OFFSETS: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
// Preserve the original pitch math and inclusive-boundary tolerance.
// Tuning and gate are explicit inputs; this module has no browser dependencies.
export function parseNote(str: string): ParsedNote {
  const m = /^([A-Ga-g])([#b♯♭]?)([0-8])?$/.exec(str.trim());
  if (!m) throw Error('Invalid note: ' + str);
  const base = NOTE_OFFSETS[m[1].toUpperCase()],
    acc = ['#', '♯'].includes(m[2]) ? 1 : ['b', '♭'].includes(m[2]) ? -1 : 0;
  return {
    pc: (base + acc + 12) % 12,
    octave: m[3] === undefined ? null : +m[3],
    midi: m[3] === undefined ? null : (+m[3] + 1) * 12 + base + acc,
  };
}

export function evaluate(
  freq: number,
  config: PitchTarget,
  a4: number,
): PitchMeasurement {
  const n = parseNote(config.pitch),
    m = 69 + 12 * Math.log2(freq / a4),
    target = n.midi ?? Math.round((m - n.pc) / 12) * 12 + n.pc,
    cents = 1200 * Math.log2(freq / (a4 * 2 ** ((target - 69) / 12)));
  return {
    cents,
    status:
      cents < config.min - 1e-7
        ? 'low'
        : cents > config.max + 1e-7
          ? 'high'
          : 'correct',
    frequency: freq,
  };
}

export function detectPitch(
  buf: Float32Array,
  sr: number,
  gate: number,
): number | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < gate) return null;
  const min = Math.floor(sr / 1600),
    max = Math.min(Math.ceil(sr / 55) + 2, buf.length / 2 - 1),
    count = buf.length - max - 1,
    diff = new Float32Array(max + 1);
  let total = 0,
    tau = -1;
  for (let t = 1; t <= max; t++) {
    let sum = 0;
    for (let j = 0; j < count; j++) {
      const delta = buf[j] - buf[j + t];
      sum += delta * delta;
    }
    total += sum;
    diff[t] = total ? (sum * t) / total : 1;
    if (t > min + 1 && diff[t - 1] < 0.12 && diff[t] >= diff[t - 1]) {
      tau = t - 1;
      break;
    }
  }
  if (tau < 0) return null;
  const left = diff[tau - 1],
    mid = diff[tau],
    right = diff[tau + 1],
    den = left - 2 * mid + right,
    offset = den ? (left - right) / (2 * den) : 0,
    f = sr / (tau + offset);
  return Number.isFinite(f) && f >= 54.99 && f <= 1601 ? f : null;
}

export function isPitchStatus(value: unknown): value is PitchStatus {
  return value === 'low' || value === 'correct' || value === 'high';
}
