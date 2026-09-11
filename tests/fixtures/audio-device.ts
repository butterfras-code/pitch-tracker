import type { Page } from '@playwright/test';

/** Test-only browser device boundary. The production app exposes no test globals. */
export interface SyntheticAudio {
  frequency: number;
  noise: boolean;
  requestedDevice: string;
  amplitude: number;
  requests: number;
  stopped: number;
  disconnected: number;
  oscillatorFrequency: number;
  deny: boolean;
  pending: boolean;
  release: (() => void) | null;
  endTrack: (() => void) | null;
}
declare global {
  interface Window {
    syntheticAudio: SyntheticAudio;
  }
}
export async function installAudioDevice(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const device: SyntheticAudio = (window.syntheticAudio = {
      frequency: 442,
      noise: false,
      requestedDevice: '',
      amplitude: 0.2,
      requests: 0,
      stopped: 0,
      disconnected: 0,
      oscillatorFrequency: 0,
      deny: false,
      pending: false,
      release: null,
      endTrack: null,
    });
    class TestAudioContext {
      sampleRate = 48000;
      currentTime = 0;
      destination = {};
      async resume() {}
      async close() {}
      createMediaStreamSource() {
        return {
          connect() {},
          disconnect() {
            device.disconnected++;
          },
        };
      }
      createAnalyser() {
        return {
          fftSize: 4096,
          getFloatTimeDomainData(samples: Float32Array) {
            let seed = 7;
            for (let i = 0; i < samples.length; i++) {
              seed = (seed * 16807) % 2147483647;
              samples[i] = device.noise
                ? (seed / 2147483647 - 0.5) * 0.8
                : device.amplitude *
                  Math.sin((2 * Math.PI * device.frequency * i) / 48000);
            }
          },
        };
      }
      createOscillator() {
        const oscillator = {
          frequency: { value: 0 },
          onended: null as (() => void) | null,
          connect() {},
          disconnect() {},
          start() {
            device.oscillatorFrequency = oscillator.frequency.value;
          },
          stop() {
            setTimeout(() => oscillator.onended?.(), 10);
          },
        };
        return oscillator;
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
          connect() {},
          disconnect() {},
        };
      }
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: TestAudioContext,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        async enumerateDevices() {
          return [
            { kind: 'audioinput', deviceId: 'room', label: 'Room microphone' },
          ];
        },
        async getUserMedia(constraints: MediaStreamConstraints) {
          device.requestedDevice =
            typeof constraints.audio === 'object' &&
            typeof constraints.audio.deviceId === 'object' &&
            !Array.isArray(constraints.audio.deviceId)
              ? String(constraints.audio.deviceId.exact ?? '')
              : '';
          device.requests++;
          if (device.deny)
            throw new DOMException('Permission denied', 'NotAllowedError');
          if (device.pending)
            await new Promise<void>((resolve) => {
              device.release = resolve;
            });
          const track = {
            onended: null as (() => void) | null,
            stop() {
              device.stopped++;
            },
          };
          device.endTrack = () => track.onended?.();
          return { getTracks: () => [track], getAudioTracks: () => [track] };
        },
      },
    });
  });
}
