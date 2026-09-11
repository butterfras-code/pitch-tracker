/** Entry screen for starting a session. Active sessions render through classroom-view.ts. */
import type { App } from '../app/application';
import { classResults } from '../domain/class-results';
import { esc } from './helpers';
export const sessionView = {
  sessionHTML(this: App): string {
    return `<section class="class-overview" aria-label="Class sessions">
      <div class="class-overview-heading"><div><h2>Your classes</h2><p class="muted">Review results and start your next session.</p></div><button data-ui-click="new-class">Add class</button></div>
      <div class="class-grid">${this.db.classes
        .map((cls) => {
          const result = classResults(cls, this.db.sessions);
          const { allTime, lastSession, latest } = result;
          const percent = (value: number | null | undefined) =>
            value == null ? '—' : `${value}%`;
          return `<article class="panel class-card" data-class-id="${esc(cls.id)}" aria-label="${esc(cls.name)}">
          <div class="class-card-heading"><div><h3>${esc(cls.name)}</h3><p class="muted">${result.students} ${result.students === 1 ? 'student' : 'students'}</p></div><button data-ui-click="edit-class" data-id="${esc(cls.id)}">Edit class</button></div>
          <table aria-label="${esc(cls.name)} results"><thead><tr><td></td><th scope="col">All Time</th><th scope="col">Last Session</th></tr></thead><tbody>
            <tr><th scope="row">Total correct</th><td>${allTime.correct}</td><td>${lastSession?.correct ?? '—'}</td></tr>
            <tr><th scope="row">Correct %</th><td>${percent(allTime.percent)}</td><td>${percent(lastSession?.percent)}</td></tr>
            <tr><th scope="row">Students checked</th><td>${allTime.checked} of ${allTime.students}</td><td>${lastSession ? `${lastSession.checked} of ${lastSession.students}` : '—'}</td></tr>
          </tbody></table>
          <p class="class-last-session muted">${latest ? `Last session · <time datetime="${new Date(latest.started).toISOString()}">${esc(new Date(latest.started).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }))}</time>${result.ongoing ? ' · In progress' : ''}` : 'No sessions yet'}</p>
          <div class="class-card-footer">${!result.students && !result.ongoing ? '<p class="muted">Add students through Edit class to get started.</p>' : ''}<button class="primary" data-ui-click="start-class-session" data-id="${esc(cls.id)}" ${!result.students && !result.ongoing ? 'disabled' : ''}>${result.ongoing ? 'Resume session' : 'Start session'}</button></div>
        </article>`;
        })
        .join('')}</div>
      <p class="class-results-help muted">Correct % is based on recorded attempts. Students checked counts each student once. All Time includes past rosters; Last Session uses the roster saved for that session, including absent students.</p>
    </section>`;
  },
  renderCards(this: App): void {
    if (this.tab === 'session' && this.ses()) this.renderClassroom();
  },
};
