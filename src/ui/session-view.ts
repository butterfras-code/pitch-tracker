/** Renders the active session and roster with escaped content and named actions. */
import { findElement } from './helpers';
import type { App } from '../app/application';
import { parseNote } from '../domain/pitch';
import { $, elapsed, esc, options, rate, stamp, statusName } from './helpers';

export const sessionView = {
  sessionHTML(this: App): string {
    const s = this.ses(),
      p = this.pupil(),
      a = this.attempts(),
      done = this.present().filter((x) => this.attempts(x.id).length).length;
    return /* HTML */ `<div
        class="row spread noprint"
        style="margin-bottom:18px"
      >
        <div class="row">
          <label
            >Class<select id="classSelect" data-ui-change="change-class">
              ${this.classOptions()}
            </select></label
          >
          <div>
            <strong>${s ? esc(s.name) : 'Ready for a new session'}</strong>
            <div class="muted">
              ${s ? stamp(s.started) : 'Your roster, your pace.'}
            </div>
          </div>
        </div>
        <div class="row">
          ${s ? /* HTML */ `<button data-ui-click="toggle-focus">${this.focusMode ? 'Show roster' : 'Focus view'}</button><button data-ui-click="session-notes">Session notes</button><button data-ui-click="end-session">Finish session</button>` : /* HTML */ `<button class="primary" data-ui-click="new-session">Start session</button>`}
        </div>
      </div>
      ${
        !s
          ? /* HTML */ `<div class="panel empty">
              <h2>Make every turn count.</h2>
              <p style="margin:12px 0">
                Start with
                ${this.cls().students.filter((s) => !s.archived).length}
                students in ${esc(this.cls().name)}, or manage your classes
                first.
              </p>
              <button class="primary" data-ui-click="new-session">
                Start session
              </button>
            </div>`
          : /* HTML */ `<div class="panel stats">
                <div>
                  <div class="stat">
                    ${done}<small> / ${this.present().length}</small>
                  </div>
                  <small>Students checked</small>
                </div>
                <div>
                  <div class="stat">${a.length}</div>
                  <small>Attempts</small>
                </div>
                <div>
                  <div class="stat">${rate(a)}</div>
                  <small>Attempts in range</small>
                </div>
                <div>
                  <div class="stat" id="elapsed">${elapsed(s)}</div>
                  <small>Session elapsed</small>
                </div>
                <div style="margin-left:auto">
                  <button
                    data-ui-click="undo"
                    ${this.undoStack.length ? '' : 'disabled'}
                  >
                    Undo last change
                  </button>
                </div>
              </div>
              <div class="layout">
                <section class="panel focus stack">
                  <div class="row spread">
                    <span class="eyebrow">On the stand</span
                    ><span class="badge"
                      >${this.present().length - done} left to check</span
                    >
                  </div>
                  <div>
                    <h2>${p ? esc(p.name) : 'Choose a student'}</h2>
                    <p class="muted">
                      ${p ? esc(p.instrument) : 'Use the roster or pick next.'}
                    </p>
                  </div>
                  ${p ? /* HTML */ `<div class="help">Target <strong>${esc(this.db.configs[p.instrument].pitch)}</strong> · ${this.db.configs[p.instrument].min} to +${this.db.configs[p.instrument].max} cents<br />${parseNote(this.db.configs[p.instrument].pitch).octave === null ? 'Any octave' : 'Exact octave'} · concert pitch · A4 = ${this.db.settings.a4} Hz</div>` : ''}
                  <div class="tuner">
                    <div class="note" id="liveNote">—</div>
                    <div class="muted" id="liveHz">
                      ${this.mic ? 'Listening for a clear tone' : 'Microphone off'}
                    </div>
                    <div class="meter"><i class="needle" id="needle"></i></div>
                    <div id="liveCents">
                      ${p ? 'Cents relative to target' : 'Select a student to compare'}
                    </div>
                    <div class="progress"><i id="holdProgress"></i></div>
                    <small id="checkHint"
                      >${this.checking ? 'Hold a steady tone…' : 'Checks record one attempt after a steady hold.'}</small
                    >
                  </div>
                  <div class="row">
                    <button id="micButton" data-ui-click="toggle-mic">
                      ${this.mic ? 'Stop microphone' : 'Enable microphone'}</button
                    ><button
                      data-ui-click="reference-tone"
                      ${p ? '' : 'disabled'}
                    >
                      Hear target
                    </button>
                  </div>
                  <button
                    class="primary full"
                    id="checkButton"
                    data-ui-click="start-check"
                    ${p && !s.absent.includes(p.id) ? '' : 'disabled'}
                  >
                    Check pitch · ${this.db.settings.hold}s hold</button
                  ><button
                    id="cancelButton"
                    class="full ${this.checking ? '' : 'hidden'}"
                    data-ui-click="cancel-check"
                  >
                    Cancel check
                  </button>
                  <div>
                    <small>Or record your judgment</small>
                    <div class="scorebar" style="margin-top:6px">
                      ${['low', 'correct', 'high'].map((v, i) => /* HTML */ `<button class="${v}" data-ui-click="record" data-status="${v}" ${p && !s.absent.includes(p.id) ? '' : 'disabled'}>${statusName(v)}<br /><small>${i + 1}</small></button>`).join('')}
                    </div>
                  </div>
                  <div class="row">
                    <button class="primary" data-ui-click="next-student">
                      Next student →</button
                    ><button data-ui-click="random-student">Random</button
                    ><button
                      data-ui-click="active-student-notes"
                      ${p ? '' : 'disabled'}
                    >
                      Notes
                    </button>
                  </div>
                  <label
                    ><input
                      type="checkbox"
                      ${this.db.settings.advance ? 'checked' : ''}
                      data-ui-change="advance"
                    />
                    Advance after recording</label
                  ><small
                    >Keys: 1 / 2 / 3 score · N next · R random · Space check ·
                    Esc cancel · Ctrl/Cmd+Z undo</small
                  >
                </section>
                <section class="roster-area">
                  <div class="row spread" style="margin-bottom:12px">
                    <h2>Class roster</h2>
                    <div class="row">
                      <input
                        id="search"
                        aria-label="Search students"
                        placeholder="Find a student…"
                        value="${esc(this.search)}"
                        data-ui-input="search"
                      /><select
                        aria-label="Filter roster"
                        data-ui-change="filter-roster"
                      >
                        ${options(['all', 'not tested', 'needs practice', 'absent'], this.filter)}
                      </select>
                    </div>
                  </div>
                  <div class="cards" id="cards"></div>
                </section>
              </div>`
      }`;
  },
  renderCards(this: App): void {
    if (!findElement('cards') || !this.ses()) return;
    const s = this.ses();
    if (!s) return;
    const list = s.roster.filter((p) => {
      const a = this.attempts(p.id),
        last = a.at(-1);
      return (
        (p.name + ' ' + p.instrument)
          .toLowerCase()
          .includes(this.search.toLowerCase()) &&
        (this.filter === 'all' ||
          (this.filter === 'absent' && s.absent.includes(p.id)) ||
          (this.filter === 'not tested' &&
            !a.length &&
            !s.absent.includes(p.id)) ||
          (this.filter === 'needs practice' &&
            last &&
            last.status !== 'correct'))
      );
    });
    $('cards').innerHTML =
      list
        .map((p) => {
          const a = this.attempts(p.id),
            last = a.at(-1),
            abs = s.absent.includes(p.id);
          return /* HTML */ `<article
            class="student ${p.id === this.db.activeStudent ? 'selected' : ''} ${abs ? 'absent' : ''}"
          >
            <div class="row spread" style="margin:0">
              <button
                class="name"
                data-ui-click="select-student"
                data-id="${p.id}"
              >
                ${esc(p.name)}</button
              ><button
                aria-label="History for ${esc(p.name)}"
                data-ui-click="student-notes"
                data-id="${p.id}"
              >
                ↗
              </button>
            </div>
            <small
              >${esc(p.instrument)} ·
              ${esc(this.db.configs[p.instrument].pitch)}</small
            >
            <div class="row spread">
              <span class="badge ${last?.status || ''}"
                >${abs ? 'Absent' : statusName(last?.status)}</span
              ><small>${a.length} tries · ${rate(a)}</small>
            </div>
            <div class="row scorebar">
              ${['low', 'correct', 'high'].map((v) => /* HTML */ `<button class="score ${v}" data-ui-click="record" data-status="${v}" data-id="${p.id}" ${abs ? 'disabled' : ''}>${statusName(v)} · ${a.filter((x) => x.status === v).length}</button>`).join('')}
            </div>
            <div class="row spread">
              <label
                ><input
                  type="checkbox"
                  ${abs ? 'checked' : ''}
                  data-ui-change="attendance"
                  data-id="${p.id}"
                />
                Absent</label
              ><small>${s.notes[p.id] ? 'Note added' : ''}</small>
            </div>
          </article>`;
        })
        .join('') || '<div class="empty">No students match this view.</div>';
  },
};
