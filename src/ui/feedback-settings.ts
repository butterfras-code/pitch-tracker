/** Shared, auto-saved preference control for session and administration settings. */
import { FEEDBACK_CATALOG } from '../themes/registry';
export function feedbackDurationControl(durationMs?: number | null): string {
  const seconds = FEEDBACK_CATALOG.defaults.durationMs / 1000;
  return `<div class="feedback-settings"><label for="feedbackDuration">Feedback popup duration (seconds)</label><input id="feedbackDuration" type="number" min="0.5" max="30" step="0.1" value="${durationMs == null ? '' : durationMs / 1000}" placeholder="Default: ${seconds}" aria-describedby="feedbackDurationHelp" data-ui-change="feedback-duration"><small id="feedbackDurationHelp">0.5–30 seconds. Leave blank to use the ${seconds}-second default. Changes save automatically.</small></div>`;
}
