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
  if (buf.length < 32 || !Number.isFinite(sr) || sr < 4000) return null;
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (!Number.isFinite(rms) || rms < gate) return null;
  // A target-independent low-pass reduces broadband energy before YIN. Keep
  // the original RMS gate: filtering must not turn up quiet sounds. Discard
  // filter startup so it cannot look like a low-frequency note.
  const filtered = lowPass(buf, sr);
  const samples = filtered.subarray(Math.floor(sr * 0.003));
  const min = Math.floor(sr / 1600),
    max = Math.min(Math.ceil(sr / 55) + 2, Math.floor(samples.length / 2) - 1),
    count = samples.length - max - 1,
    diff = new Float32Array(max + 1);
  let total = 0;
  for (let t = 1; t <= max; t++) {
    let sum = 0;
    for (let j = 0; j < count; j++) {
      const delta = samples[j] - samples[j + t];
      sum += delta * delta;
    }
    total += sum;
    diff[t] = total ? (sum * t) / total : 1;
  }
  // A loud overtone can already satisfy the absolute YIN threshold. Compare
  // all period candidates before choosing the shortest comparably good one;
  // the true fundamental explains the weaker harmonics as well.
  let best = 1;
  for (let t = min + 1; t < max; t++) best = Math.min(best, diff[t]);
  const threshold = Math.min(0.18, best + 0.02);
  let tau = -1;
  for (let t = min + 1; t < max; t++) {
    if (
      diff[t] < threshold &&
      diff[t] < diff[t - 1] &&
      diff[t] <= diff[t + 1]
    ) {
      tau = t;
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

/** Two-pole Butterworth, 2 kHz cutoff; no target note or retained device state. */
function lowPass(buf: Float32Array, sr: number): Float32Array {
  const w = (2 * Math.PI * Math.min(2000, sr * 0.4)) / sr,
    cos = Math.cos(w),
    alpha = Math.sin(w) / Math.SQRT2,
    a0 = 1 + alpha,
    b0 = (1 - cos) / (2 * a0),
    b1 = 2 * b0,
    a1 = (-2 * cos) / a0,
    a2 = (1 - alpha) / a0,
    out = new Float32Array(buf.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i],
      y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}

export function isPitchStatus(value: unknown): value is PitchStatus {
  return value === 'low' || value === 'correct' || value === 'high';
}
