import type { KeyValueStorage } from './tracker-store';

// Resolve localStorage at operation time: even accessing it can throw when denied.
export const browserStorage: KeyValueStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
