# Development handoff

Checkpoint: September 9, 2026. Modularization is in progress; the application is functional. This checkpoint includes the development tooling and the first three extractions. No push or deployment was requested.

## Non-negotiable release requirement

The user must be able to double-click one self-contained `dist/index.html` and use the app offline in a browser. No server, installation, CDN, remote font, or adjacent runtime asset is permitted. Source `index.html` is a development entry point; distribute the built file. Never edit `dist` manually. See [AGENTS.md](../AGENTS.md) and [architecture.md](architecture.md).

`Pitch-Tracker.html` remains the unchanged upstream baseline from commit `94777d5`. Develop in `index.html` and `src/`. Preserve behavior and the v1 saved-data format during extraction; separate feature changes from refactoring.

## Completed

- Installed and locked TypeScript, Vite, vite-plugin-singlefile, Vitest, Playwright, ESLint, and Prettier. Added a Windows GitHub Actions verification workflow and release artifact upload. The workflow has not yet been exercised remotely.
- Extracted CSS to `src/styles.css`; builds inline both CSS and module JavaScript into one HTML file.
- Extracted pure note parsing, cents evaluation/classification, and pitch detection into `src/domain/pitch.ts`. Tuning and noise gate are explicit inputs.
- Added v1 data types in `src/domain/tracker.ts` and pure backup validation/parsing in `src/domain/backup.ts`.
- Extracted tracker load/save/restore into `src/persistence/tracker-store.ts` behind `KeyValueStorage`, with a lazy browser adapter. Existing storage keys, revision conflict detection, recovery copies, and replacement import semantics are retained. Failed saves no longer advance the in-memory revision.
- Replaced all inline UI event attributes and UI event-property assignments with named actions and delegated listeners in `src/ui/events.ts`. Forms, dynamically rendered controls, nested button content, and disabled controls are covered. No runtime evaluation of attribute code is used.

## Current integration boundary

The source `index.html` still contains classic scripts for themes, mutable application state, controller operations, HTML render functions, audio orchestration, and lifecycle/keyboard listeners. It is intentionally not yet fully type checked.

`src/main.ts` imports the typed modules and calls the temporary global `startTracker(domain, services)` after parsing. That function initializes storage and rendering, then returns action callbacks closing over the current state. The entry point binds delegated UI listeners once. Keep saved-data validation behind this initialization boundary until the bridge is replaced.

The action callbacks themselves still reside in the classic controller. Removing inline event attributes did not finish controller or rendering extraction. Theme preference storage also remains separate from the tracker storage adapter.

## Next work, in order

1. Extract controller and state into typed modules: session creation/finish/resume, active selection, scoring, attendance, next/random selection, undo, and action callbacks. Preserve live state references; callbacks must not capture stale snapshots after restore or undo.
2. Extract renderers for session/roster, history, settings, and dialogs. Keep named `data-ui-*` actions and escaped user content. Preserve focus behavior, browser form validation, and dialog submission.
3. Extract theme management and audio orchestration, including microphone lifecycle, stable-hold checks, reference tones, cancellation, and cleanup. Keep pure pitch math independent of browser APIs.
4. Remove the global bootstrap bridge when the controller can be imported directly. Extend strict typing to the remaining app instead of hiding errors with broad casts or disabling checks.
5. Manually verify real microphone permissions and input, reference playback, keyboard accessibility, narrow layouts, and printing. Automated synthetic audio tests do not verify physical devices.
6. Push only when requested; confirm the remote workflow passes after pushing.

## Test and build commands

Use Node 22.22.3 and npm. For a fresh checkout:

```sh
npm ci
npx playwright install chromium firefox
npm run verify
```

`npm run verify` performs type checking, linting, formatting checks, build, unit tests, and browser tests. The current passing baseline is **33 unit tests and 30 browser tests (63 total)**. Browser tests use the built release under `file://`, with networking disabled and ordinary browser security settings. A copied-file test exercises relocation to a folder containing spaces.

`npm run dev` is optional development tooling. `npm run build` produces the distributable `dist/index.html`; Node is not needed to use that file. Generated outputs, browser downloads, reports, and node_modules are not committed.

## Test seams and limitations to preserve

- `tests/e2e/workflows.spec.ts` has a synthetic audio test that currently accesses classic lexical globals through `page.evaluate`. When removing those globals, replace this seam with injected audio-device dependencies or browser API stubs; do not expose production globals solely for tests or drop the coverage.
- Storage failure tests inject denied access, quota errors, malformed data, and a newer stored revision. Conflict coverage models another writer without relying on browser-specific file-URL storage-event delivery.
- Browser storage belongs to the browser profile/file location, not the HTML file. Moving the release may expose a different store. JSON export/import is the portable backup path.
- Recovery and primary writes are separate operations, not a transaction. A failed primary restore may update the recovery slot while preserving primary data. Revision checks are not an atomic cross-window lock.
- Type definitions should be checked against all existing runtime fields during controller extraction; for example, corrected attempts preserve an optional `originalStatus` field in the existing controller, which is not yet declared in `Attempt`.
- Source HTML and the upstream baseline are excluded from Prettier during the transition; newly extracted modules are formatted and checked normally.
