import './themes/pitch-press.css';
import './themes/big-button.css';
import './themes/lisa-lives.css';
import './themes/vintage-audio.css';
import './themes/boom-pow.css';
import './themes/b-pop-tune-hunters.css';
import './session-layout.css';
import './tuner.css';
import './header-layout.css';
import './class-overview.css';
import './feedback.css';
import { createApplication, initializeApplication } from './app/application';
import { browserStorage } from './persistence/browser-storage';
import { createTrackerStore } from './persistence/tracker-store';
import { createBindings } from './ui/actions';
import { bindUiEvents } from './ui/events';
import { bindLifecycle } from './ui/lifecycle';
import { initializeThemes } from './ui/themes';

const app = createApplication(createTrackerStore(browserStorage));
const disposeThemes = initializeThemes(
  (message) => app.toast(message),
  () => app.pitchFeedback.clear(),
);
initializeApplication(app);
const disposeEvents = bindUiEvents(document, createBindings(app));
const disposeLifecycle = bindLifecycle(app);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.disposed = true;
    disposeThemes();
    disposeEvents();
    disposeLifecycle();
    app.workspace?.dispose();
    void app.ctx?.close();
    app.ctx = null;
  });
}
