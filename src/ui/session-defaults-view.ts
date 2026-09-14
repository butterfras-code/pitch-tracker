import type { TrackerData } from '../domain/tracker';
import { sessionDefaults } from '../domain/session-defaults';

export function sessionDefaultsHTML(data: TrackerData): string {
  const defaults = sessionDefaults(data);
  return /* HTML */ `<form class="stack" data-ui-submit="session-defaults">
    <h3>Session defaults</h3>
    <p class="muted">
      Used when starting, resuming, or reopening a session. Changes do not
      affect the current session. Session controls can override them. The
      microphone starts off.
    </p>
    <div class="default-controls">
      <label
        ><input
          name="advance"
          type="checkbox"
          ${defaults.advance ? 'checked' : ''}
          data-ui-change="session-defaults-auto-save"
        />
        Auto Advance</label
      >
      <label
        >Advance mode<select
          name="mode"
          data-ui-change="session-defaults-auto-save"
        >
          <option
            value="until-correct"
            ${defaults.mode === 'until-correct' ? 'selected' : ''}
          >
            Until correct
          </option>
          <option
            value="one-and-done"
            ${defaults.mode === 'one-and-done' ? 'selected' : ''}
          >
            One and done
          </option>
        </select></label
      >
      <label
        ><input
          name="claps"
          type="checkbox"
          ${defaults.claps ? 'checked' : ''}
          data-ui-change="session-defaults-auto-save"
        />
        Clap navigation</label
      >
      <label
        >Starting view<select
          name="view"
          data-ui-change="session-defaults-auto-save"
        >
          ${[
            ['auto', 'Automatic'],
            ['split', 'Split'],
            ['student', 'Student'],
            ['class', 'Class'],
          ]
            .map(
              ([value, label]) =>
                `<option value="${value}" ${defaults.view === value ? 'selected' : ''}>${label}</option>`,
            )
            .join('')}
        </select></label
      >
    </div>
    <p class="help">
      Automatic view uses Student on phones and Split otherwise. Clap navigation
      uses two claps for next and three for back while listening.
    </p>
    <p id="sessionDefaultsError" role="alert" class="danger"></p>
  </form>`;
}
