# Pitch Tracker

An offline mouthpiece practice tracker with rosters, sessions, manual scoring, microphone pitch checks, and selectable themes. Source imported from https://github.com/butterfras-code/pitch-tracker.

## Development

Use Node 22.22.3 or a compatible newer supported version and npm.

```sh
npm ci
npx playwright install chromium firefox
npm run dev
```

The development server is optional tooling. End users need only the built HTML and a browser.

## Build and verify

```sh
npm run verify
```

This runs type checking, linting, formatting checks, the production build, packaging tests, and browser tests. Playwright opens file URLs directly with networking disabled; no test web server is used.

Double-click `dist/index.html` to open the release. The original `Pitch-Tracker.html` remains an unchanged baseline; use `index.html` and `src/` for development. Copy that file anywhere to distribute it. `npm run build` only builds; `npm test` rebuilds and runs the packaging unit tests; `npm run test:e2e` rebuilds and runs browser tests.

Current checks cover pitch calculations, packaging, offline launch and relocation, scoring, undo, attendance, reload, theme persistence, and backup restoration in Chromium and Firefox. Microphone hardware and permission behavior require manual testing. Records live in browser storage, not inside the HTML. Back up data before moving or renaming the file. Restore replaces existing records after validation and confirmation. Cel-Shaded Mech is the default theme; Classic Studio is available in the selector. See [THEMES.md](THEMES.md) for theme guidance (edit the registry in index.html during this transition).

See [architecture](docs/architecture.md) and [guard rails](AGENTS.md).
