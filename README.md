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

Vitest and Playwright each use at most six workers by default. Verification runs these suites sequentially; Playwright shares its six workers across Chromium and Firefox and also parallelizes tests within each file. Tests must keep browser state isolated and use `testInfo.outputPath()` for new artifacts.

For faster iteration, select the relevant tests:

```sh
npm test -- tests/unit/pitch.test.ts
npm run test:e2e -- tests/e2e/tuner.spec.ts
npm run test:e2e -- tests/e2e/tuner.spec.ts --project=chromium
```

After building once, use `npx vitest run <test-file>` or `npx playwright test <test-file>` to avoid rebuilding when only tests changed. Rebuild whenever app source or bundled assets change. Use `--workers=2` for Playwright or `--maxWorkers=2` for Vitest on resource-constrained machines. Keep the full two-browser verification for changes spanning the suite.

Double-click `dist/index.html` to open the release. The original `Pitch-Tracker.html` remains an unchanged baseline; use `src/index.html` and the rest of `src/` for development. The root `index.html` is the latest deployed build committed for convenient downloading and must not be edited by hand. Copy `dist/index.html` anywhere—including to a flash drive—to distribute it. `npm run build` only builds; `npm test` rebuilds and runs the domain, persistence, and packaging unit tests; `npm run test:e2e` rebuilds and runs browser tests.

`npm run deploy:pages` must be run from a clean `main` branch. It builds the app, updates and commits the root `index.html`, pushes `main`, and then publishes the identical file to `gh-pages`.

Current checks cover pitch calculations, packaging, offline launch and relocation, scoring, undo, attendance, reload, theme persistence, and backup restoration in Chromium and Firefox. Microphone hardware and permission behavior require manual testing. Records live in browser storage, not inside the HTML. Back up data before moving or renaming the file. Restore replaces existing records after validation and confirmation. Pithcer-Frice is the default theme. See [THEMES.md](THEMES.md) for theme guidance (theme definitions live in `src/themes/`).

The source is modular and strictly typed: `src/domain/` holds rules and data, `src/persistence/` holds storage, `src/app/` coordinates state changes, `src/ui/` renders and binds controls, and `src/audio/` manages detection and devices. Start with [the handoff](docs/handoff.md) for the current checkpoint and next work.

See [architecture](docs/architecture.md) and [guard rails](AGENTS.md).
