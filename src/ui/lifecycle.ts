import { findElement } from './helpers';

import type { App } from '../app/application';
import { $, elapsed } from './helpers';

import { TRACKER_KEY } from '../persistence/tracker-store';
export function bindLifecycle(app: App): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const elapsedTimer = setInterval(() => {
    const s = app.ses();
    if (findElement('elapsed') && s) $('elapsed').textContent = elapsed(s);
  }, 1000);
  document.addEventListener(
    'keydown',
    (e) => {
      if (
        e.altKey &&
        e.key === 'Enter' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.isComposing &&
        app.tab === 'session' &&
        app.ses() &&
        !$('modal').open &&
        !app.pitchFeedback.visible
      ) {
        e.preventDefault();
        if (!e.repeat) void app.workspace?.fullscreen();
        return;
      }
      if (
        $('modal').open ||
        app.pitchFeedback.visible ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(
          document.activeElement?.tagName ?? '',
        ) ||
        app.tab !== 'session' ||
        !app.ses()
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        app.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        app.record((['low', 'correct', 'high'] as const)[+e.key - 1]);
      } else if (e.key.toLowerCase() === 'n') app.classroomNavigate(1);
      else if (e.key.toLowerCase() === 's') app.shuffleStudents();
      else if (e.code === 'Space') {
        e.preventDefault();
        app.startCheck();
      } else if (e.key === 'Escape') {
        app.classroomPaused = true;
        app.cancelCheck();
        app.render();
      }
    },
    options,
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        app.cancelCheck();
        if (findElement('holdProgress')) $('holdProgress').style.width = '0%';
      }
    },
    options,
  );
  window.addEventListener(
    'pagehide',
    () => {
      app.pitchFeedback.clear();
      app.stopMic();
    },
    options,
  );
  window.addEventListener(
    'storage',
    (e) => {
      if (e.key === TRACKER_KEY) {
        app.storageBlocked = true;
        app.warning(
          'This tracker was changed in another window. Back up any unsaved work here, then reload. Saving is paused to prevent conflicts.',
        );
      }
    },
    options,
  );

  return () => {
    controller.abort();
    clearInterval(elapsedTimer);
    clearTimeout(app.toastTimer);
    app.pitchFeedback.clear();
    app.stopMic();
  };
}
