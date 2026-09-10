/** Renders session history, summaries, and original measurement details. */
import type { App } from '../app/application';
import { esc, rate, stamp, statusName } from './helpers';
import type { Attempt } from '../domain/tracker';
export const historyView = {
  attemptTable(this: App, a: Attempt[], editable = false, sid = ''): string {
    return a.length
      ? /* HTML */ `<div class="tablewrap">
          <table>
            <thead>
              <tr>
                <th>When / student</th>
                <th>Result</th>
                <th>Measurement</th>
                ${editable ? '<th>Correct</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${a
                .map(
                  (x) =>
                    /* HTML */ `<tr>
                      <td>
                        ${esc(x.name)}<br /><small>${stamp(x.time)}</small>
                      </td>
                      <td>
                        <span class="badge ${x.status}"
                          >${statusName(x.status)}</span
                        ><br /><small
                          >${esc(x.source)} · target
                          ${esc(x.target.pitch)}</small
                        >
                      </td>
                      <td>
                        ${x.frequency === null ? 'Manual' : x.frequency.toFixed(1) + ' Hz / ' + Math.round(x.cents ?? 0) + '¢'}
                      </td>
                      ${editable ? /* HTML */ `<td><button data-ui-click="edit-attempt" data-session-id="${sid}" data-id="${x.id}">Edit</button></td>` : ''}
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : '<p class="empty">No attempts yet.</p>';
  },
  historyHTML(this: App): string {
    const ss = this.db.sessions
        .filter((s) => s.classId === this.db.classId)
        .slice()
        .reverse(),
      students = new Map();
    ss.forEach((s) => s.roster.forEach((p) => students.set(p.id, p.name)));
    const all = ss
      .flatMap((s) => s.attempts)
      .filter(
        (a) =>
          this.historyStudent === 'all' || a.studentId === this.historyStudent,
      );
    return /* HTML */ `<div class="row spread" style="margin-bottom:20px">
        <h2>History & progress</h2>
        <div class="row noprint">
          <select aria-label="History class" data-ui-change="history-class">
            ${this.classOptions()}</select
          ><select
            aria-label="Student history"
            data-ui-change="history-student"
          >
            <option value="all">All students</option>
            ${[...students].map(([id, n]) => /* HTML */ `<option value="${id}" ${this.historyStudent === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select
          ><button data-ui-click="export-csv">Export CSV</button
          ><button data-ui-click="print">Print</button>
        </div>
      </div>
      <div class="panel stats">
        <div>
          <div class="stat">${ss.length}</div>
          <small>Sessions</small>
        </div>
        <div>
          <div class="stat">${all.length}</div>
          <small>Attempts</small>
        </div>
        <div>
          <div class="stat">${rate(all)}</div>
          <small>Attempts in range</small>
        </div>
      </div>
      ${
        ss
          .map((s) => {
            const a = s.attempts.filter(
              (a) =>
                this.historyStudent === 'all' ||
                a.studentId === this.historyStudent,
            );
            return /* HTML */ `<section class="panel">
              <div class="row spread">
                <div>
                  <h3>
                    ${esc(s.name)}
                    <span class="badge"
                      >${s.ended ? 'Finished' : 'In progress'}</span
                    >
                  </h3>
                  <small
                    >${stamp(s.started)} · ${a.length} attempts · ${rate(a)} in
                    range</small
                  >
                </div>
                <div class="row noprint">
                  <button data-ui-click="resume-session" data-id="${s.id}">
                    ${s.ended ? 'Resume' : 'Open'}</button
                  ><button data-ui-click="export-csv" data-id="${s.id}">
                    CSV</button
                  ><button
                    class="danger"
                    data-ui-click="delete-session"
                    data-id="${s.id}"
                  >
                    Delete
                  </button>
                </div>
              </div>
              ${s.note ? /* HTML */ `<p class="history-note" style="margin-top:12px">${esc(s.note)}</p>` : ''}
              <details style="margin-top:14px">
                <summary>Student summary & attempts</summary>
                <div class="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Attendance</th>
                        <th>Low / in range / high</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${s.roster
                        .filter(
                          (p) =>
                            this.historyStudent === 'all' ||
                            p.id === this.historyStudent,
                        )
                        .map((p) => {
                          const pa = s.attempts.filter(
                            (x) => x.studentId === p.id,
                          );
                          return /* HTML */ `<tr>
                            <td>
                              ${esc(p.name)}<br /><small
                                >${esc(p.instrument)}</small
                              >
                            </td>
                            <td>
                              ${s.absent.includes(p.id) ? 'Absent' : 'Present'}
                            </td>
                            <td>
                              ${['low', 'correct', 'high'].map((v) => pa.filter((a) => a.status === v).length).join(' / ')}
                            </td>
                            <td class="history-note">
                              ${esc(s.notes[p.id] || '')}
                            </td>
                          </tr>`;
                        })
                        .join('')}
                    </tbody>
                  </table>
                </div>
                ${this.attemptTable(a.slice().reverse(), true, s.id)}
              </details>
            </section>`;
          })
          .join('') ||
        '<div class="panel empty">Completed sessions and student progress will appear here.</div>'
      }`;
  },
};
