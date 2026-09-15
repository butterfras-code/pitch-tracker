import { sessionDefaultsHTML } from './session-defaults-view';
import { targetRow, detectionSlider } from './pitch-settings';
import { feedbackDurationControl } from './feedback-settings';
/** Renders roster administration, pitch settings, and offline help. */
import type { App } from '../app/application';
import { esc, stamp } from './helpers';

export const adminView = {
  adminHTML(this: App): string {
    return /* HTML */ `<div class="row spread" style="margin-bottom:20px">
        <div class="class-editor-heading">
          <button data-ui-click="back-to-classes">Back to classes</button>
          <div>
            <h2>Edit ${esc(this.cls().name)}</h2>
            <p class="muted">
              Rosters persist. Past sessions retain their original names and
              instruments.
            </p>
          </div>
        </div>
        <div class="row">
          <button data-ui-click="backup">Download backup</button
          ><button data-ui-click="restore-backup">Restore backup</button>
        </div>
      </div>
      <div class="panel">
        <div class="row spread">
          <div class="row">
            <select aria-label="Manage class" data-ui-change="change-class">
              ${this.classOptions()}</select
            ><button data-ui-click="new-class">New class</button
            ><button data-ui-click="rename-class">Rename</button>
          </div>
          <button class="primary" data-ui-click="add-students">
            Add students
          </button>
        </div>
        <p class="help" style="margin:16px 0">
          Roster edits apply to the next session. Archive a student to remove
          them from future rosters while keeping their history.
        </p>
        <div class="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Instrument</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              ${this.cls()
                .students.map(
                  (p) =>
                    /* HTML */ `<tr>
                      <td>${esc(p.name)}</td>
                      <td>${esc(p.instrument)}</td>
                      <td>${p.archived ? 'Archived' : 'Active'}</td>
                      <td>
                        <button data-ui-click="edit-student" data-id="${p.id}">
                          Edit
                        </button>
                        <button
                          data-ui-click="archive-student"
                          data-id="${p.id}"
                        >
                          ${p.archived ? 'Restore' : 'Archive'}</button
                        ><button
                          class="danger"
                          data-ui-click="delete-student"
                          data-id="${p.id}"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div> `;
  },
  settingsHTML(this: App): string {
    const names = Object.keys(this.db.configs);
    const selected = this.db.configs[this.settingsInstrument]
      ? this.settingsInstrument
      : (names[0] ?? '');
    this.settingsInstrument = selected;
    const nav = /* HTML */ `<nav
      class="settings-nav"
      aria-label="Settings sections"
    >
      ${[
        ['instruments', 'Instruments'],
        ['detection', 'Detection'],
        ['defaults', 'Defaults'],
      ]
        .map(
          ([section, label]) =>
            `<button type="button" data-ui-click="settings-section" data-section="${section}" class="${this.settingsSection === section ? 'on' : ''}" aria-current="${this.settingsSection === section ? 'page' : 'false'}">${label}</button>`,
        )
        .join('')}
    </nav>`;
    let content: string;
    if (this.settingsSection === 'instruments')
      content = /* HTML */ `<form
        class="settings-pane panel"
        data-ui-submit="settings"
      >
        <header class="settings-pane-header">
          <div>
            <h2>Instruments</h2>
            <p class="muted">
              Set the concert pitch target and accepted range.
            </p>
          </div>
          <div class="instrument-toolbar">
            <label
              >Instrument<select
                aria-label="Edit instrument"
                data-ui-change="settings-instrument"
              >
                ${names.map((name) => `<option ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}
              </select></label
            >
            <button
              type="button"
              aria-label="Add instrument"
              data-ui-click="add-instrument"
            >
              Add
            </button>
            <button
              type="button"
              aria-label="Delete instrument"
              class="danger"
              data-ui-click="delete-instrument"
            >
              Delete
            </button>
          </div>
        </header>
        <div class="settings-pane-scroll">
          <p class="muted">
            Choose a concert note and octave, then drag Min, Target, and Max.
            Moving Target keeps the range width. Min and Max are cents relative
            to Target. Use arrow keys for precise adjustments.
          </p>
          <div class="tablewrap target-table-wrap">
            <table id="configTable" data-a4="${this.db.settings.a4}">
              <tbody>
                ${selected ? targetRow(selected, this.db.configs[selected], this.db.settings.a4) : ''}
              </tbody>
            </table>
          </div>
        </div>
        <p id="settingsError" role="alert" class="danger"></p>
        <div class="settings-action-bar">
          <span id="settingsDraftStatus" role="status">All changes saved</span>
          <div class="row">
            <button
              type="button"
              data-ui-click="discard-settings"
              data-settings-dirty-action
              disabled
            >
              Revert changes
            </button>
            <button class="primary">Save settings</button>
          </div>
        </div>
      </form>`;
    else if (this.settingsSection === 'detection')
      content = /* HTML */ `<section class="settings-pane panel">
        <header class="settings-pane-header">
          <div>
            <h2>Detection</h2>
            <p class="muted">Changes save automatically.</p>
          </div>
        </header>
        <div class="settings-pane-scroll">
          <div class="detection-controls">
            ${detectionSlider('a4', 'A4 reference (Hz)', this.db.settings.a4, 400, 480, 0.1, 'Hz', '400 Hz', '480 Hz')}
            ${detectionSlider('hold', 'Steady hold (seconds)', this.db.settings.hold, 0.5, 5, 0.1, 'seconds', 'Shorter hold', 'Longer hold')}
            ${detectionSlider('stability', 'Allowed pitch spread (cents)', this.db.settings.stability, 5, 100, 1, 'cents', 'Steadier pitch', 'More variation')}
            ${detectionSlider('gate', 'Noise gate (RMS; lower = more sensitive)', this.db.settings.gate, 0.001, 0.2, 0.001, 'RMS', 'More sensitive', 'More noise filtering')}
          </div>
          <p class="muted">
            The noise gate sets the minimum volume for scoring. Keep it below a
            student's playing level. Between attempts, listening resumes after a
            pause, settled background noise, or a sustained large volume drop
            with no clear tone. Playing more softly while holding a tone does
            not start another turn.
          </p>
        </div>
      </section>`;
    else
      content = /* HTML */ `<section class="settings-pane panel">
        <header class="settings-pane-header">
          <div>
            <h2>Defaults</h2>
            <p class="muted">Changes save automatically.</p>
          </div>
        </header>
        <div class="settings-pane-scroll stack">
          <section class="panel settings-default-card">
            <h3>Feedback popups</h3>
            ${feedbackDurationControl(this.db.settings.feedbackDurationMs)}
          </section>
          <section class="panel settings-default-card">
            ${sessionDefaultsHTML(this.db)}
          </section>
        </div>
      </section>`;
    return /* HTML */ `<div class="settings-shell">${nav}${content}</div>`;
  },
  helpHTML(this: App): string {
    return /* HTML */ `<div class="panel stack" style="max-width:850px">
      <aside class="notice" aria-labelledby="microphone-enhancements-warning">
        <h2 id="microphone-enhancements-warning">
          Warning: turn off microphone enhancements
        </h2>
        <p>
          Software enhancements for microphones can mistake instruments for
          background noise and filter them out. Before using automatic pitch
          detection, find the microphone or audio-input settings in your
          operating system and turn off enhancements such as noise suppression,
          voice isolation, and automatic sound processing.
        </p>
      </aside>
      <h2>A complete tracker, in one file.</h2>
      <p>
        Open this HTML file directly in a modern desktop browser. No
        installation, account, server, external fonts, or internet connection is
        required.
      </p>
      <h3>Start here</h3>
      <p>
        In Classes, create your class and add students. In Settings, verify your
        mouthpiece targets, then start a session. Mark absent students and
        select a name, or use Next. Shuffle changes the temporary round order
        without changing the saved roster. Record a manual judgment or enable
        the microphone to log steady tones automatically.
      </p>
      <h3>Choose your theme</h3>
      <p>
        Use the Theme selector at the top of any screen. Pithcer-Frice is the
        default; Pitch Press uses a printed-paper appearance. Your choice saves
        in this browser separately from class data and is not included in JSON
        backups. Switching themes keeps your current session and unsaved form
        entries.
      </p>
      <h3>What gets saved</h3>
      <p>
        Classes, settings, attendance, notes, every attempt, and your active
        session save automatically in localStorage. Reloading resumes your work.
        Undo covers the last 50 session changes in this open window; it resets
        on reload or switching sessions. History also lets you correct or delete
        individual attempts.
      </p>
      <h3>Keep a backup</h3>
      <p>
        Browser storage is tied to this browser, profile, and local file
        location. Moving or renaming the HTML file may open a separate data
        store. Private browsing, clearing browser data, or changing computers
        can remove or hide your records. Download a JSON backup after class and
        before moving the file. Restore replaces all tracker data after
        validation and confirmation; it does not merge. CSV is for spreadsheets,
        not restoration.
      </p>
      <div class="row">
        <button data-ui-click="backup">Download JSON backup</button
        ><button data-ui-click="restore-backup">Restore JSON backup</button
        >${this.loadedRaw && this.storageBlocked ? '<button data-ui-click="download-unreadable">Download unreadable stored data</button>' : ''}
      </div>
      <p class="muted">
        Last backup requested:
        ${this.db.lastBackup ? stamp(this.db.lastBackup) : 'Never'}. Confirm
        downloaded files exist before closing.
      </p>
      <h3>Microphone checks</h3>
      <p>
        Microphone permission is requested only when you enable it. Audio is
        analyzed locally and never recorded or uploaded. Allow microphone access
        in your browser. If local-file permissions or your device block it,
        manual scoring still works.
      </p>
      <p>
        The detector looks for a single periodic tone between about 55 and 1,600
        Hz. An in-range result needs reliable, stable pitch for 85% of the hold
        window: a 2-second hold needs at least 1.7 seconds of good evidence.
        Brief noise or pitch interruptions are tolerated; time with no reliable
        pitch does not count. Low or high results require a full stable hold. A
        longer break, switching students, leaving the tab, or playing a
        reference tone resets progress. Room noise, harmonics, and multiple
        players can still confuse detection; review unexpected results.
      </p>
      <p>
        Targets without an octave compare against the nearest octave of that
        pitch class. Targets with an octave compare against that exact
        frequency. Custom target offsets tune both scoring and reference
        playback. Reference tones for octave-free targets use octave 4. Min/max
        cents are inclusive; zero is valid. Hear target pauses detection briefly
        so it cannot score itself.
      </p>
      <p>
        Choose a note and octave in Settings. Drag Target to move the accepted
        range together, or Min and Max to change its edges. Fine scale shows ±50
        cents, Normal ±100, and Wide ±200. Arrow keys adjust one step. Reset to
        note removes custom tuning. The staff uses treble at middle C (C4) and
        above, bass below; click it to override or choose Auto clef. Detection
        sliders show their values as you drag and save automatically. Save
        settings applies instrument changes. Older JSON backups remain
        supported.
      </p>
      <h3>Settings and session defaults</h3>
      <p>
        Use the Instruments, Detection, and Defaults sections in Settings.
        Instrument changes remain drafts until saved; the app warns before
        navigation would discard them. Detection and default changes save
        automatically. Defaults apply when starting, resuming, switching
        classes, reopening, or restoring sessions. They do not change the
        session currently running. Microphone activation remains manual.
        Changing defaults upgrades the backup format; older app versions cannot
        read these new backups.
      </p>
      <h3>Session views</h3>
      <p>
        The instrument appears above each student’s name. Last labels the active
        student’s previous rating. Use the card’s options button to mark a
        student absent or present. The history icon beside it opens that
        student’s notes and attempts. The microphone icon shows whether input is
        on, paused, or off; the adjacent meter shows its level.
      </p>
      <p>
        The shared session toolbar stays available in every view, including
        fullscreen. Split, Student, Class, and Full screen remain directly
        available in the toolbar. Class navigation, the three advancement
        choices, clap navigation, listening, microphone options, Undo, and
        Shuffle, Finish session, and the other session controls are available
        there too. Feedback popup timing stays in Settings. Previous and Next
        remain beside the current student.
      </p>
      <p>
        Split shows the current student beside or above the class dashboard.
        Student uses the space for one player; Class puts the live target,
        tuner, and scoring controls inside the active student’s card. Full
        screen fills the display with the selected view; Exit full screen or the
        browser escape control returns to the window. On phones, Student is the
        initial view.
      </p>
      <p>
        The roster scrolls independently and follows each newly activated
        student without moving keyboard focus. You can browse freely between
        turns. If search or a filter hides the current student, their active
        card stays above the results; Show current student clears the filter and
        reveals their card.
      </p>
      <p>
        The microphone button starts, pauses, or resumes listening. Its separate
        dropdown selects an input or turns the microphone off; opening the
        dropdown does not change listening. Score the current student with the
        controls in the tuner in Split or Class view.
      </p>
      <p>
        At round completion, retry only students whose latest result needs
        practice, start another whole-class round, or finish. Previous and Undo
        preserve earlier results unless you explicitly undo a score. Skipped and
        untested students are counted separately from correct results. Round
        queues and skip markers restart when reopening or resuming; attempts
        remain saved. Expanded settings, enlarged text and very short screens
        may scroll to keep controls reachable.
      </p>
      <h3>Hands-free classroom turns</h3>
      <p>
        Enable the microphone once. Each turn waits for half a second of quiet
        or about a second of settled background noise without a detected pitch,
        then listens for a tone automatically. With Auto Advance on, Until
        correct stays for retries; One and done moves on after any completed
        result. Each attempt is saved. The round stops after the last present
        student. Previous student revisits a student without deleting their
        results. Undo reverses the last score or navigation.
      </p>
      <p>
        Clap navigation is initially off unless enabled in Session defaults. Use
        two claps to move forward or three to go back. Use distinct claps about
        a third of a second apart; the app waits half a second after the last
        clap before deciding. Commands work between tones. Pause listening
        disables scoring and clap commands. Classroom noise can trigger or
        obscure claps; disable the control when needed. Session overrides reset
        to Session defaults on reopening. Saved defaults are included in
        backups.
      </p>
      <h3>During class</h3>
      <p>
        1 / 2 / 3 = low / in range / high. N = next, S = shuffle, Space = start
        listening. Escape pauses listening. Ctrl/Cmd+Z undoes the latest session
        change. Shortcuts are disabled while typing or using a dialog. Next
        follows the current round order. Shuffle randomizes that order without
        recording an attempt. Both exclude absent students.
      </p>
      <h3>Local administration</h3>
      <p>
        Anyone with access to this browser profile can access the tracker. The
        Classes section is organizational, not password protection. Use separate
        browser profiles or operating-system accounts when needed.
      </p>
    </div>`;
  },
};
