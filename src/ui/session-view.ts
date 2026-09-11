/** Entry screen for starting a session. Active sessions render through classroom-view.ts. */
import type { App } from '../app/application';
import { esc } from './helpers';
export const sessionView = {
  sessionHTML(this: App): string {
    return `<div class="row"><label>Class<select id="classSelect" data-ui-change="change-class">${this.classOptions()}</select></label></div><div class="panel empty"><h2>Make every turn count.</h2><p>Start with ${this.cls().students.filter((p) => !p.archived).length} students in ${esc(this.cls().name)}.</p><button class="primary" data-ui-click="new-session">Start session</button></div>`;
  },
  renderCards(this: App): void {
    if (this.tab === 'session' && this.ses()) this.renderClassroom();
  },
};
