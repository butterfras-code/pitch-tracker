/** Owns microphone permission, cancellation, reference tones, and audio cleanup. */
import { findElement } from '../ui/helpers';
import { errorMessage } from '../ui/helpers';
import type { App } from '../app/application';
import { parseNote } from '../domain/pitch';
import { $ } from '../ui/helpers';

export const microphone = {
  context(this: App): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) throw Error('Web Audio is unavailable in this browser.');
      this.ctx = new AC();
    }
    return this.ctx;
  },
  async enableMic(this: App): Promise<boolean> {
    if (this.disposed) return false;
    if (this.mic) return true;
    if (this.pendingMic) return false;
    this.pendingMic = true;
    const generation = ++this.micGeneration;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          'Microphone access is unavailable for this local file. Use a browser that permits local microphone access, or score manually.',
        );
      await this.context().resume();
      if (generation !== this.micGeneration) return false;
      const result = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(this.microphoneId
            ? { deviceId: { exact: this.microphoneId } }
            : {}),
        },
        video: false,
      });
      if (generation !== this.micGeneration) {
        result.getTracks().forEach((t) => t.stop());
        return false;
      }
      this.stream = result;
      this.source = this.context().createMediaStreamSource(this.stream);
      this.analyser = this.context().createAnalyser();
      this.analyser.fftSize = 4096;
      this.source.connect(this.analyser);
      this.mic = true;
      this.microphoneError = '';
      void this.refreshMicrophones();
      this.stream.getAudioTracks()[0].onended = () => {
        this.stopMic();
        this.microphoneError =
          'Microphone disconnected. Reconnect it or select another input. Manual scoring is available.';
        this.toast(this.microphoneError);
        this.render();
      };
      this.lastFrame = performance.now();
      this.lastAnalysis = 0;
      this.raf = requestAnimationFrame((now) => this.audioLoop(now));
      return true;
    } catch (e) {
      if (generation !== this.micGeneration) return false;
      this.stopMic();
      this.microphoneError =
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow access in the browser, or use manual scoring.'
          : errorMessage(e);
      this.toast(this.microphoneError);
      return false;
    } finally {
      this.pendingMic = false;
    }
  },
  async toggleMic(this: App): Promise<void> {
    if (this.mic || this.pendingMic) this.stopMic();
    else {
      this.classroomPaused = false;
      this.cancelCheck();
      await this.enableMic();
    }
    if (!this.disposed) this.render();
  },
  stopMic(this: App): void {
    this.micGeneration++;
    for (const stop of this.referenceStops) stop();
    this.mic = false;
    this.cancelCheck();
    cancelAnimationFrame(this.raf);
    this.source?.disconnect();
    this.source = null;
    this.analyser = null;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.stream = null;
    }
  },
  cancelCheck(this: App): void {
    this.checkGeneration++;
    this.classroomListenerReady = false;
    this.classroomListener.reset();
    this.checking = null;
    this.holdSamples = [];
    this.holdStart = null;
    if (findElement('holdProgress')) $('holdProgress').style.width = '0%';
    if (findElement('cancelButton')) $('cancelButton').classList.add('hidden');
    if (findElement('checkHint'))
      $('checkHint').textContent = 'Listening automatically after a quiet gap.';
  },
  async startCheck(this: App): Promise<void> {
    const s = this.ses(),
      id = this.db.activeStudent;
    if (!s || !id || !this.pupil() || s.absent.includes(id)) return;
    this.classroomPaused = false;
    this.roundComplete = false;
    const sid = s.id,
      checkGeneration = this.checkGeneration;
    if (await this.enableMic()) {
      if (
        this.checkGeneration !== checkGeneration ||
        this.tab !== 'session' ||
        this.ses()?.id !== sid ||
        this.db.activeStudent !== id
      ) {
        if (!this.disposed) this.render();
        return;
      }
      this.cancelCheck();
      // Automatic arming happens only after fresh quiet audio observations.
      this.render();
    }
  },
  async refreshMicrophones(this: App): Promise<void> {
    const generation = this.micGeneration;
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (this.disposed || generation !== this.micGeneration) return;
      this.microphoneDevices = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label }));
      if (this.tab === 'session' && this.ses()) this.renderClassroom();
    } catch {
      if (!this.disposed && generation === this.micGeneration)
        this.microphoneDevices = [];
    }
  },
  async changeMicrophone(this: App, id: string): Promise<void> {
    const listening = this.mic;
    this.stopMic();
    this.microphoneId = id;
    this.microphoneError = '';
    if (listening) await this.enableMic();
    if (!this.disposed) this.render();
  },
  async referenceTone(this: App): Promise<void> {
    const pupil = this.pupil();
    if (!pupil || this.disposed) return;
    this.cancelCheck();
    this.muteUntil = performance.now() + 2200;
    const generation = this.micGeneration;
    const target = this.db.configs[pupil.instrument].pitch,
      a4 = this.db.settings.a4;
    try {
      const ac = this.context();
      await ac.resume();
      if (generation !== this.micGeneration || this.disposed) return;
      const n = parseNote(target),
        m = n.midi ?? 60 + n.pc,
        osc = ac.createOscillator(),
        gain = ac.createGain();
      osc.frequency.value = a4 * 2 ** ((m - 69) / 12);
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.03);
      gain.gain.setValueAtTime(0.12, ac.currentTime + 1.1);
      gain.gain.linearRampToValueAtTime(0, ac.currentTime + 1.3);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1.35);
      const cleanup = () => {
        osc.disconnect();
        gain.disconnect();
        this.referenceStops.delete(stop);
      };
      const stop = () => {
        osc.onended = null;
        osc.stop();
        cleanup();
      };
      this.referenceStops.add(stop);
      osc.onended = cleanup;
      this.toast('Reference tone · detection pauses briefly.');
    } catch (e) {
      if (!this.disposed) this.toast(errorMessage(e));
    }
  },
};
