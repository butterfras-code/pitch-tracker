# Development handoff

Checkpoint: September 9, 2026. The application is modularized, strictly typed, functional, testable, and buildable. This checkpoint contains the completed extraction and its verification coverage.

## Release requirement

Distribute the single built `dist/index.html`, which opens by double-click under `file://` and works offline. No server, Node installation, internet, CDN, remote font, or adjacent runtime file is required by users. Never edit `dist` manually. `Pitch-Tracker.html` is the unchanged upstream baseline from `94777d5`; develop in `index.html` and `src/`.

## Completed

- Removed all classic application scripts and the global `startTracker` bridge. `src/main.ts` imports and wires the application directly.
- Extracted controller actions, per-instance state, session/roster/history/settings renderers, dialogs, theme management, keyboard/lifecycle listeners, microphone management, and detection into strict TypeScript modules. Templates and source HTML are now formatted.
- Moved session queries and transitions into browser-independent domain modules, including creation/finish/resume, class selection, scoring, attendance, fair next/random selection, snapshots, and undo.
- Preserved v1 records, revision protection, recovery-backed restore, original measurements, UI actions, and native form behavior. Added the existing optional `Attempt.originalStatus` field to the type and round-trip coverage.
- Kept callbacks bound to a stable application object while restore and undo replace data/session objects. Added domain and browser coverage for subsequent actions using current state.
- Replaced the legacy-global synthetic audio test with browser device API stubs. Added permission denial, delayed-request cleanup, reference playback, device disconnection, and single-recording coverage.
- Reproduced and fixed a cancellation race: Escape during a pending microphone permission request could arm a check later. Separate check generations now invalidate that pending check.
- Added explicit listener/timer cleanup and development hot-replacement cleanup. Stopping audio also cleans up active reference tones.

See [architecture.md](architecture.md) for the module map, dependency direction, state ownership, and extension guidance. Theme definitions now live in `src/themes/*.theme.ts`; see [themes.md](themes.md) for the copy-file/build workflow.

## Verification

Use Node 22.22.3 and npm. For a fresh checkout:

```sh
npm ci
npx playwright install chromium firefox
npm run verify
```

The checkpoint suite has **39 unit tests and 40 browser tests (79 total)**. `npm run verify` includes type checking, linting, formatting, build, and all tests. Browser checks use the actual built release under offline file URLs in Chromium and Firefox.

Desktop and 390-pixel session layouts were visually inspected in headless Chromium; the narrow page had no horizontal overflow or page errors. History print rendering was inspected and a PDF generated. Expand history details before printing when student details are needed. Keyboard and dialog behavior have automated coverage.

Real microphone permissions, physical input, reference playback through speakers, and hands-on accessibility checks still need a person with the target browser/hardware. Synthetic audio tests cannot verify those. The Windows GitHub Actions workflow has not been run remotely in this task.

## Next development step

The extraction is complete; feature development can proceed. The next recorded feature is **PT-001: focus-mode auto-advance**, documented in [roadmap.md](roadmap.md). Settle its behavior before implementation:

- Whether manual correct scores trigger advancement.
- Whether low/high results re-arm detection for the same student.
- How a sustained tone is prevented from scoring the next student.
- Roster boundary behavior and whether the toggle persists.

Use `src/domain/session.ts` for existing Next selection, `src/app/session-controller.ts` for recording coordination, `src/audio/detection.ts` for accepted holds, and `src/ui/session-view.ts` for the toggle. Keep feature changes separate from this refactor and preserve the single-file offline contract.

Push only when explicitly requested; after a requested push, verify the remote workflow.

## Constraints to preserve

- Methods declare `this: App`: call them on the application object or use closures when passing them to browser APIs. Do not capture stale `db` or session objects in callbacks.
- Keep domain code independent of DOM, storage, and audio. Add behavior tests at the appropriate boundary rather than exposing production globals for tests.
- Moving the release may change its browser storage. JSON backup/restore is the portable path.
- Recovery and primary writes are separate operations; revision checks are not an atomic cross-window lock. Invalid or failed restores must preserve primary data and current UI state.
- Source changes are checked strictly; do not add broad casts or disable checks to accommodate new code.
