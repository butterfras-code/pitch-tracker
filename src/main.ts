import * as pitchDomain from './domain/pitch';
import { validateBackup } from './domain/backup';
import { browserStorage } from './persistence/browser-storage';
import {
  createTrackerStore,
  StorageConflictError,
} from './persistence/tracker-store';
import { bindUiEvents, type UiBindings } from './ui/events';

const dataServices = {
  validateBackup,
  StorageConflictError,
  store: createTrackerStore(browserStorage),
};

declare global {
  interface Window {
    startTracker: (
      domain: typeof pitchDomain,
      services: typeof dataServices,
    ) => UiBindings;
  }
}

// Temporary bridge while the existing controller and lexical state remain.
// Module scripts run after parsing: storage validation can safely use the domain
// functions from the very first load, including a previously saved session.
const bindings = window.startTracker(pitchDomain, dataServices);
bindUiEvents(document, bindings);
