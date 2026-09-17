import type { App } from '../app/application';
import { parseNote } from '../domain/pitch';
import {
  transposition,
  tunerTarget,
  tunerTranspositions,
} from '../domain/tuner';
import { updateMicrophoneIndicator } from './microphone-indicator';
import { esc } from './helpers';

const notes = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const microphoneIcon = `<svg class="microphone-status-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3M9 21h6"/><path class="microphone-off-mark" d="m4 4 16 16"/><path class="microphone-paused-mark" d="M18 16v6m4-6v6"/></svg>`;
const speakerIcon = `<svg aria-hidden="true" viewBox="0 0 48 40"><path d="M4 14h9L25 4v32L13 26H4z" fill="currentColor"/><path d="M32 11q12 9 0 18m6-25q20 16 0 32" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;
const displayPitch = (pitch: string) =>
  pitch.replace('b', '♭').replace('#', '♯');

export const tunerView = {
  tunerHTML(this: App): string {
    const parsed = parseNote(this.tunerTargetPitch);
    const note = this.tunerTargetPitch.replace(/[0-8]$/, '');
    const octave = parsed.octave ?? 4;
    const selected = transposition(this.tunerTransposition);
    const target = tunerTarget(this.tunerTargetPitch, this.tunerTransposition);
    const listeningLabel = !this.mic
      ? 'Start listening'
      : this.classroomPaused
        ? 'Resume listening'
        : 'Pause listening';
    const status = this.tunerStatus();
    return `<section id="sessionShell" class="session-shell tuner-shell focus" data-mode="tuner" data-transposition="${this.tunerTransposition}" data-range="${this.tunerLastStatus}" aria-label="Tuner only mode">
      <div class="session-toolbar" aria-label="Tuner controls">
        <div class="session-meta"><strong>Tuner only</strong><span>Uses your saved detection and pitch settings</span></div>
        <span class="microphone-split" role="group" aria-label="Microphone controls"><button id="toolbarListening" class="toolbar-listening" data-ui-click="${this.mic ? 'pause-listening' : 'start-check'}" data-microphone="${this.mic && !this.classroomPaused ? 'on' : 'off'}" aria-label="${listeningLabel}" aria-pressed="${this.mic && !this.classroomPaused}">${microphoneIcon}<span id="toolbarListeningLabel">${listeningLabel}</span></button><button class="microphone-options-trigger" data-ui-click="microphone-options" aria-label="Microphone options" aria-expanded="false" aria-controls="microphoneOptions" popovertarget="microphoneOptions">▾</button></span>
        <button data-ui-click="tuner-fullscreen" aria-label="${document.fullscreenElement ? 'Exit full screen' : 'Full screen'}" aria-pressed="${!!document.fullscreenElement}" title="Full screen tuner"><span class="fullscreen-icon" aria-hidden="true">⛶</span></button>
      </div>
      <div id="microphoneOptions" class="microphone-options" popover="auto"><h2>Microphone options</h2><label>Microphone input<select id="microphoneInput" data-ui-change="microphone-input"><option value="">Browser default</option>${this.microphoneDevices.map((device, index) => `<option value="${esc(device.deviceId)}" ${device.deviceId === this.microphoneId ? 'selected' : ''}>${esc(device.label || `Microphone ${index + 1}`)}</option>`).join('')}</select></label><button data-ui-click="turn-microphone-off" ${this.mic ? '' : 'hidden'}>Turn microphone off</button></div>
      <div class="tuner-only-workspace">
        <section class="tuner-controls panel" aria-label="Tuner target settings">
          <div class="tuner-control-fields">
            <label>Transposition<select data-ui-change="tuner-transposition">${tunerTranspositions.map((item) => `<option value="${item.id}" ${item.id === this.tunerTransposition ? 'selected' : ''}>${item.label}</option>`).join('')}</select></label>
            <label>Target note<select data-ui-change="tuner-target-note">${notes.map((item) => `<option value="${item}" ${item === note ? 'selected' : ''}>${displayPitch(item)}</option>`).join('')}</select></label>
            <label>Octave<select data-ui-change="tuner-target-octave">${Array.from({ length: 9 }, (_, item) => `<option ${item === octave ? 'selected' : ''}>${item}</option>`).join('')}</select></label>
          </div>
          <div class="tuner-target-summary"><span>Target</span><strong>${displayPitch(this.tunerTargetPitch)}</strong>${this.tunerTransposition === 'concert' ? '' : `<small>Sounds ${displayPitch(target.pitch)} in concert pitch</small>`}<button class="primary target-playback" data-ui-click="reference-tone" aria-label="Hear current target">${speakerIcon}<span>Hear target</span></button></div>
        </section>
        <section class="tuner-only-display current-display" aria-label="Live tuner">
          <div class="tuner-streak"><span>Streak</span><strong id="tunerStreak">${this.tunerStreak}</strong><button data-ui-click="reset-tuner-streak" ${this.tunerStreak ? '' : 'disabled'}>Reset</button></div>
          <div class="tuner-section" data-live-practice>
            <div class="tuner">
              <div class="tuner-note-displays">
                <div class="tuner-note-display"><span class="tuner-note-heading">Concert pitch</span><div class="note" id="liveNote">—</div></div>
                <div class="tuner-note-display transposed-note"><span class="tuner-note-heading">${selected.label.replace(' transposition', '')} transposed pitch</span><div class="note" id="writtenLiveNote">—</div></div>
              </div>
              <div id="liveHz" class="tuner-frequency">${this.mic && !this.classroomPaused ? 'Listening for a clear tone' : ''}</div>
              <div class="meter-labels" aria-hidden="true"><span>Low</span><span>High</span></div><div class="meter"><i class="needle" id="needle"></i></div>
              <div class="input-signal"><span id="inputStatus" class="input-status" role="img" aria-label="Microphone off" title="Microphone off" data-microphone="off">${microphoneIcon}</span><meter id="inputLevel" aria-label="Microphone level" min="0" max="0.25" value="0"></meter></div>
              <div class="tuner-cents" id="liveCents" aria-label="Cents relative to target">—</div><div class="progress"><i id="holdProgress"></i></div>
            </div>
            <div class="scorebar tuner-feedback" aria-label="Pitch feedback"><span class="low" data-status="low">Too low</span><span class="correct" data-status="correct">In range</span><span class="high" data-status="high">Too high</span></div>
          </div>
          <p id="tunerResult" class="tuner-result" role="status">${this.tunerResultText()}</p>
          <p id="classroomStatus" class="tuner-status" role="status">${status === 'Microphone off' ? '' : status}</p>
          <p id="micError" class="tuner-error" role="status">${this.microphoneError}</p>
        </section>
      </div>
    </section>`;
  },
  renderTuner(this: App): void {
    document.getElementById('main')!.innerHTML = this.tunerHTML();
    updateMicrophoneIndicator(
      this.mic,
      this.classroomPaused,
      this.tunerStatus(),
    );
  },
};
