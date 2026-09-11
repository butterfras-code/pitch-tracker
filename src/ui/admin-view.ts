/** Renders roster administration, pitch settings, and offline help. */
import type { App } from '../app/application';
import { esc, stamp } from './helpers';

export const adminView = {
  adminHTML(this: App): string {
    return /* HTML */ `<div class="row spread" style="margin-bottom:20px">
        <div>
          <h2>Classes & settings</h2>
          <p class="muted">
            Rosters persist. Past sessions retain their original names and
            instruments.
          </p>
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
      </div>
      <form class="panel" data-ui-submit="settings">
        <h2>Pitch targets & detection</h2>
        <p class="muted">
          Concert pitch. Use A, F#, Bb for any octave; A4 or Bb3 for an exact
          octave. Targets are teacher-defined, not instrument recommendations.
        </p>
        <div class="tablewrap">
          <table id="configTable">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Target</th>
                <th>Min cents</th>
                <th>Max cents</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(this.db.configs)
                .map(
                  ([n, c]) =>
                    /* HTML */ `<tr data-instrument="${esc(n)}">
                      <td>${esc(n)}</td>
                      <td>
                        <input
                          aria-label="${esc(n)} target"
                          class="pitch"
                          value="${esc(c.pitch)}"
                          required
                        />
                      </td>
                      <td>
                        <input
                          aria-label="${esc(n)} minimum cents"
                          class="min"
                          type="number"
                          min="-600"
                          max="600"
                          value="${c.min}"
                          required
                        />
                      </td>
                      <td>
                        <input
                          aria-label="${esc(n)} maximum cents"
                          class="max"
                          type="number"
                          min="-600"
                          max="600"
                          value="${c.max}"
                          required
                        />
                      </td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="fields" style="margin-top:20px">
          <label
            >A4 reference (Hz)<input
              id="a4"
              type="number"
              min="400"
              max="480"
              step="0.1"
              value="${this.db.settings.a4}"
              required /></label
          ><label
            >Steady hold (seconds)<input
              id="hold"
              type="number"
              min="0.5"
              max="5"
              step="0.1"
              value="${this.db.settings.hold}"
              required /></label
          ><label
            >Allowed pitch spread (cents)<input
              id="stability"
              type="number"
              min="5"
              max="100"
              value="${this.db.settings.stability}"
              required /></label
          ><label
            >Noise gate (RMS; lower = more sensitive)<input
              id="gate"
              type="number"
              min="0.001"
              max="0.2"
              step="0.001"
              value="${this.db.settings.gate}"
              required
          /></label>
        </div>
        <div class="row" style="margin-top:18px">
          <button class="primary">Save settings</button
          ><button type="button" data-ui-click="add-instrument">
            Add instrument
          </button>
        </div>
        <p id="settingsError" role="alert" class="danger"></p>
      </form>`;
  },
  helpHTML(this: App): string {
    return /* HTML */ `<div class="panel stack" style="max-width:850px">
      <h2>A complete tracker, in one file.</h2>
      <p>
        Open this HTML file directly in a modern desktop browser. No
        installation, account, server, external fonts, or internet connection is
        required.
      </p>
      <h3>Start here</h3>
      <p>
        In Classes & settings, create your class and add students. Verify your
        mouthpiece targets, then start a session. Mark absent students and
        select a name, or use Next / Random. Record a manual judgment or enable
        the microphone to log steady tones automatically.
      </p>
      <h3>Choose your theme</h3>
      <p>
        Use the Theme selector at the top of any screen. Cel-Shaded Mech is the
        default; Classic Studio restores the original appearance. Your choice
        saves in this browser separately from class data and is not included in
        JSON backups. Switching themes keeps your current session and unsaved
        form entries.
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
        Hz. A check requires a continuous stable pitch; silence, uncertain
        pitch, switching students, leaving the tab, or playing a reference tone
        cancels or resets the hold. A stable tone can be low or high—it need not
        be in range to count. Room noise, harmonics, and multiple players can
        confuse detection; use your judgment and correct results when needed.
      </p>
      <p>
        Targets without an octave compare against the nearest octave of that
        pitch class. Targets with an octave compare against that exact
        frequency. Reference tones for octave-free targets use octave 4. Min/max
        cents are inclusive; zero is valid. Hear target pauses detection briefly
        so it cannot score itself.
      </p>
      <h3>Session views</h3>
      <p>
        Split shows the current student beside or above the class dashboard.
        Student uses the space for one player; Class keeps a compact
        current-student strip above the roster. Full screen fills the display
        with the selected view; Exit full screen or the browser escape control
        returns to the window. On phones, Student is the initial view.
      </p>
      <p>
        The roster scrolls independently and follows each newly activated
        student without moving keyboard focus. You can browse freely between
        turns. If search or a filter hides the current student, their name stays
        above the results; Show current student clears the filter and reveals
        their card.
      </p>
      <p>
        Session behavior settings contains advance mode, clap navigation,
        microphone input and Teacher details. Teacher details reveals
        per-student scoring and note access; it is off when you reopen the file
        and is not a password or access restriction. Pause, Previous, Next and
        Undo stay available in every view.
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
        Enable the microphone once. Each turn waits for half a second of quiet,
        then logs a steady tone automatically. With Auto Advance on, Until
        correct stays for retries; One and done moves on after any completed
        result. Each attempt is saved. The round stops after the last present
        student. Previous student revisits a student without deleting their
        results. Undo reverses the last score or navigation.
      </p>
      <p>
        Clap navigation is off by default. Enable it for two claps to move
        forward or three to go back. Use distinct claps about a third of a
        second apart; the app waits half a second after the last clap before
        deciding. Commands work between tones. Pause listening disables scoring
        and clap commands. Classroom noise can trigger or obscure claps; disable
        the control when needed. Advance mode and clap settings are temporary
        and reset on reopening; they are not included in backups.
      </p>
      <h3>During class</h3>
      <p>
        1 / 2 / 3 = low / in range / high. N = next, R = random, Space = start
        listening. Escape pauses listening. Ctrl/Cmd+Z undoes the latest session
        change. Shortcuts are disabled while typing or using a dialog. Next
        follows roster order; Random prioritizes the fewest attempts within the
        current round. Both exclude absent students.
      </p>
      <h3>Local administration</h3>
      <p>
        Anyone with access to this browser profile can access the tracker. The
        admin tab is organizational, not password protection. Use separate
        browser profiles or operating-system accounts when needed.
      </p>
    </div>`;
  },
};
