import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

export const recordings = [
  { file: 'c', label: 'C', sounding: 'Eb4', hz: 311.126984 },
  { file: 'f-sharp', label: 'F#', sounding: 'B4', hz: 493.883301 },
  { file: 'a-flat', label: 'Ab', sounding: 'A5', hz: 880 },
] as const;

export function recordedAudio(file: string): Float32Array {
  const bytes = gunzipSync(
    readFileSync(new URL(`./recordings/${file}.pcm.gz`, import.meta.url)),
  );
  return Float32Array.from(
    { length: bytes.length / 2 },
    (_, i) => bytes.readInt16LE(i * 2) / 32768,
  );
}
