# Room recordings

These three regression fixtures come from the user's attached tuner/room recordings. They are test data only and are never bundled into the release.

| Original filename | Observed harmonic fundamental | Sounding note at A4 = 440 Hz | Notable overtone                                             |
| ----------------- | ----------------------------- | ---------------------------- | ------------------------------------------------------------ |
| C.m4a             | approximately 311.17 Hz       | E-flat 4                     | 1555.81 Hz, fifth harmonic, much louder than the fundamental |
| F Sharp.m4a       | approximately 494.11 Hz       | B4                           | 1482.26 Hz, third harmonic, louder than the fundamental      |
| A Flat.m4a        | approximately 880.00 Hz       | A5                           | 1759.98 Hz, second harmonic                                  |

The filenames are user-supplied labels, **not pitch ground truth**. A Hann-windowed Fourier spectrum of the original left-channel recording established the harmonic series independently of `detectPitch`; sinusoidal projections verified matching components in both stereo channels. Decoding at 44.1 kHz also confirmed the timing/frequency scale. The user subsequently confirmed the tuner's transposition setting caused the intended/recorded-note mismatch.

Chromium `OfflineAudioContext.decodeAudioData` decoded the source M4A files at 48 kHz. Both channels were averaged, quantized to signed 16-bit little-endian PCM without normalization, and compressed with Node's `gzipSync`. `manifest.json` records the original attachment hashes and format. This avoids a codec, ffmpeg, internet, or Python requirement during tests. `recorded-audio.ts` reads them using Node built-ins. Its reference frequencies are equal-tempered reference notes used for cents comparisons, not claimed exact measurements of the recordings.

Unit tests scan complete recordings through the detector. Browser tests supply the recorded samples at the device boundary using the test clock and run the real analysis/hold/recording path in the offline built HTML. Each file must score its sounding target correctly, and must remain wrong against its filename target; the detector receives neither label nor expected frequency.
