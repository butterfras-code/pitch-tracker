/** Renders forms and dialogs while preserving native validation and focus. */
import type { App } from '../app/application';
import { $, esc, options, rate } from './helpers';

export const dialogs = {
  showDialog(this: App, html: string): void {
    $('modalBody').innerHTML = html;
    $('modal').showModal();
  },
  closeDialog(this: App): void {
    $('modal').close();
  },
  closeDialogIfOpen(this: App): void {
    if ($('modal').open) this.closeDialog();
  },
  newSession(this: App): void {
    const roster = this.cls().students.filter((s) => !s.archived);
    if (!roster.length) {
      this.toast('Add students in Classes first.');
      return;
    }
    this.showDialog(
      /* HTML */ `<h2>Start a session</h2>
        <p class="muted">${esc(this.cls().name)} · ${roster.length} students</p>
        <form data-ui-submit="create-session">
          <label
            >Session name<input
              id="sessionName"
              required
              maxlength="120"
              value="${esc(new Date().toLocaleDateString() + ' · Mouthpiece practice')}"
          /></label>
          <div class="row" style="margin-top:18px">
            <button class="primary">Start session</button
            ><button type="button" data-ui-click="close-dialog">Cancel</button>
          </div>
        </form>`,
    );
  },
  sessionNotes(this: App): void {
    const s = this.ses();
    if (!s) return;
    this.showDialog(
      /* HTML */ `<h2>Session notes</h2>
        <form data-ui-submit="session-notes">
          <textarea id="snote" maxlength="10000" aria-label="Session notes">
${esc(s.note)}</textarea
          ><button class="primary">Save notes</button>
          <button type="button" data-ui-click="close-dialog">Cancel</button>
        </form>`,
    );
  },
  studentDetail(this: App, id: string | null): void {
    if (!id) return;
    const s = this.ses(),
      p =
        s?.roster.find((p) => p.id === id) ||
        this.cls().students.find((p) => p.id === id);
    if (!p) return;
    const all = this.db.sessions
      .filter((x) => x.classId === this.db.classId)
      .flatMap((x) => x.attempts.filter((a) => a.studentId === id));
    this.showDialog(
      /* HTML */ `<h2>${esc(p.name)}</h2>
        <p class="muted">
          ${all.length} lifetime attempts · ${rate(all)} in range
        </p>
        ${
          s
            ? /* HTML */ `<form data-ui-submit="student-notes" data-id="${id}">
                <label
                  >Notes for this session<textarea id="pnote" maxlength="10000">
${esc(s.notes[id] || '')}</textarea></label
                ><button class="primary">Save notes</button>
                <button type="button" data-ui-click="close-dialog">
                  Close
                </button>
              </form>`
            : '<button data-ui-click="close-dialog">Close</button>'
        }
        <h3 style="margin-top:20px">Recent attempts</h3>
        ${this.attemptTable(all.slice(-15).reverse())}`,
    );
  },
  editAttempt(this: App, sid: string, id: string): void {
    const s = this.db.sessions.find((s) => s.id === sid),
      a = s?.attempts.find((a) => a.id === id);
    if (!a) return;
    this.showDialog(
      /* HTML */ `<h2>Correct attempt · ${esc(a.name)}</h2>
        <p class="muted">
          Original measurement is preserved when you change the result.
        </p>
        <form
          data-ui-submit="edit-attempt"
          data-session-id="${sid}"
          data-id="${id}"
        >
          <label
            >Result<select id="editResult">
              ${options(['low', 'correct', 'high'], a.status)}
            </select></label
          >
          <div class="row" style="margin-top:18px">
            <button class="primary">Save correction</button
            ><button
              type="button"
              class="danger"
              data-ui-click="remove-attempt"
              data-session-id="${sid}"
              data-id="${id}"
            >
              Delete attempt</button
            ><button type="button" data-ui-click="close-dialog">Cancel</button>
          </div>
        </form>`,
    );
  },
  classDialog(this: App, rename = false): void {
    this.showDialog(
      /* HTML */ `<h2>${rename ? 'Rename class' : 'New class'}</h2>
        <form data-ui-submit="class" data-rename="${rename}">
          <label
            >Class name<input
              id="className"
              maxlength="120"
              required
              value="${rename ? esc(this.cls().name) : ''}"
          /></label>
          <div class="row" style="margin-top:18px">
            <button class="primary">Save</button
            ><button type="button" data-ui-click="close-dialog">Cancel</button>
          </div>
        </form>`,
    );
  },
  addStudent(this: App): void {
    this.showDialog(
      /* HTML */ `<h2>Add students</h2>
        <p class="muted">
          One per line: Name, Instrument. Or start with ALL: Instrument, then
          one name per line. Existing students are preserved. Names may contain
          commas; the last comma separates the instrument.
        </p>
        <form data-ui-submit="new-students">
          <textarea
            id="rosterInput"
            required
            placeholder="Alex, Trumpet&#10;Sam, Clarinet"
            aria-label="Students"
          ></textarea>
          <p id="rosterError" class="danger" role="alert"></p>
          <div class="row">
            <button class="primary">Add to roster</button
            ><button type="button" data-ui-click="close-dialog">Cancel</button>
          </div>
        </form>`,
    );
  },
  editStudent(this: App, id: string): void {
    const p = this.cls().students.find((p) => p.id === id);
    if (!p) return;
    this.showDialog(
      /* HTML */ `<h2>Edit student</h2>
        <form data-ui-submit="student" data-id="${id}">
          <div class="fields">
            <label
              >Name<input
                id="studentName"
                value="${esc(p.name)}"
                maxlength="120"
                required /></label
            ><label
              >Instrument<select id="studentInstrument">
                ${options(Object.keys(this.db.configs), p.instrument)}
              </select></label
            >
          </div>
          <div class="row" style="margin-top:18px">
            <button class="primary">Save</button
            ><button type="button" data-ui-click="close-dialog">Cancel</button>
          </div>
        </form>`,
    );
  },
};
