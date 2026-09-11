# Architecture and acceptance goals

## Release contract

Users double-click one self-contained `dist/index.html`. Node and npm are development tools only. Vite with vite-plugin-singlefile embeds all JavaScript and CSS; the release has no runtime imports, adjacent assets, CDN, server, service worker, or network requirement. Never edit `dist` manually. `Pitch-Tracker.html` remains the unchanged upstream baseline from `94777d5`.

GitHub Pages serves the same self-contained build as the downloadable release. The verification workflow uploads `dist` as a Pages artifact after all checks pass and deploys it only for `main` pushes or manual runs on `main`. Repository Pages settings must use GitHub Actions as the publishing source. Generated `dist` remains gitignored; the source-root `index.html` is a development entry point and must not be published directly.

## Module map

The application uses strict TypeScript without a UI framework. `index.html` contains the static shell and one module entry point. There are no classic application scripts or global bootstrap bridge.

| Location                                              | Responsibility                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                                         | Creates the application, loads data, initializes themes, binds events and lifecycle cleanup.                                          |
| `src/app/application.ts`, `state.ts`                  | Explicit `App` contract, method composition, and per-instance mutable state.                                                          |
| `src/domain/session.ts`, `session-changes.ts`         | Session queries, fair next/random selection, roster snapshots, scoring, attendance, finish/resume, class selection, and bounded undo. |
| `src/domain/tracker.ts`, `defaults.ts`, `identity.ts` | v1 data types, initial demo data, IDs, and snapshots.                                                                                 |
| `src/domain/pitch.ts`, `pitch-hold.ts`, `backup.ts`   | Pitch detection, timed pitch evidence, display smoothing, and portable backup validation.                                             |
| `src/app/*-controller.ts`, `selectors.ts`             | Coordinate domain transitions, forms, persistence, dialogs, and audio cancellation.                                                   |
| `src/ui/*-view.ts`, `dialogs.ts`, `render.ts`         | Escaped HTML templates, native forms, current-view rendering, and feedback.                                                           |
| `src/ui/events.ts`, `actions.ts`, `lifecycle.ts`      | Delegated named actions, keyboard handling, elapsed timer, visibility and storage events.                                             |
| `src/ui/themes.ts`, `styles.css`                      | Local theme registry and styles bundled into the release.                                                                             |
| `src/audio/microphone.ts`, `detection.ts`             | Device permission, stream and reference-tone lifecycle, pitch analysis, stable holds, and recording.                                  |
| `src/persistence/`                                    | Browser storage adapter and load/save/recovery-backed restore.                                                                        |

Runtime dependency direction:

```mermaid
flowchart TD
  Main[main.ts] --> App[Application composition]
  Main --> Events[UI bindings and lifecycle]
  App --> Controllers[Controllers]
  App --> Views[Views and dialogs]
  App --> Audio[Audio orchestration]
  Controllers --> Domain[Domain rules and models]
  Controllers --> Storage[Persistence]
  Controllers --> Helpers[UI helpers]
  Audio --> Domain
  Audio --> Helpers
  Views --> Helpers
  Storage --> Domain
```

Modules refer to `App` through **type-only** imports; they do not import the composition root at runtime. Methods explicitly declare `this: App`. Call them on the application object, and wrap calls passed to browser APIs in closures so the receiver is retained. Do not destructure unbound methods.

`SessionState` contains only data and undo snapshots. Domain transitions accept that state explicitly and have no DOM, audio, storage, or rendering dependencies. Optional time, ID, and random inputs support deterministic tests. Controllers own side effects. New rules belong in the domain; new UI behavior belongs in the relevant controller/view pair.

The shared application object stays stable while `app.db` and session objects may be replaced by restore or undo. Delegated callbacks query current state on each invocation. Do not close over old data or session snapshots. Restores clear undo only after successful persistence.

## Data and persistence

The loader and validator accept schema 1 and schema 2. Saving graphical pitch settings explicitly calls `migrateToV2`: clone validated data, promote the schema, and add zero-cent offsets to existing configurations and historical attempt targets. Schema 2 adds an optional `PitchTarget.offset` in cents (−600 to +600); omission means zero. Scoring and reference playback share this tuning convention. Schema 1 remains unchanged until the settings editor is saved, and both backup versions round-trip through validation. Original measurements and targets remain attached to corrected attempts. Invalid imports and unsupported versions do not overwrite valid data.

The storage key remains `mouthpiece.pitchtracker.v1` to discover existing file-URL data and retain the existing revision/recovery mechanism; the payload's schema is the format version. Older app releases cannot read schema 2, so backups produced after saving new settings require this release or newer. Validation preserves extra fields without normalizing input. Migration tests cover unchanged historical measurements, zero-offset defaults, v2 round-trips, and invalid imports before writes.

`createTrackerStore` accepts `KeyValueStorage`. Its browser adapter reads localStorage lazily, so denied access is handled inside load/save. Failed saves do not advance the in-memory revision. Controllers surface blocked-save warnings while leaving manual tracking usable.

Restore validates before confirmation, saves a recovery copy, and replaces primary storage before updating UI state. Recovery and primary writes are separate operations, not a transaction: a failed primary restore may update the recovery copy while preserving primary data. Revision checks detect known stale writers but are not an atomic cross-window lock.

Storage belongs to a browser profile/file location, not the HTML file. Moving or renaming the release may expose a different store. JSON export/import is the portable backup path. Theme preference storage remains separate and is not included in backups.

## UI and audio lifecycle

Static and generated controls use `data-ui-click`, `data-ui-change`, `data-ui-input`, and `data-ui-submit` with named actions. IDs and arguments use separate data attributes. The event layer executes only registered actions, handles nested button content, ignores disabled controls, and preserves native form validation and Enter submission. No attribute code is evaluated.

Templates escape user content. Required DOM elements have typed accessors; optional tuner and view elements are checked before access. Theme changes do not rerender forms or interrupt checks.

Microphone requests use a generation counter to stop late streams after cancellation. Checks use a separate generation counter so Escape, view changes, or other cancellations during a pending permission request cannot arm a later check. Frame gaps, long interruptions, reference playback, and session/student changes reset or cancel pitch evidence. Brief missing or outlying observations can be tolerated for correct results. A completed hold records once using the current target and tuning.

Stopping audio cancels animation frames, disconnects the input, stops tracks and active reference tones, and invalidates pending requests. Event binders return cleanup callbacks; development hot replacement removes listeners/timers and closes the old audio context. Page exit stops input and reference playback.

## Verification

`npm run verify` runs strict type checking, linting, formatting, the single-file build, unit tests, and browser tests. Domain tests exercise state transitions, undo limits, roster/target snapshots, selection, and data replacement. Persistence tests exercise malformed records, denied reads, failed writes, revisions, recovery copies, and round trips including corrected attempts.

Playwright runs the built file offline in Chromium and Firefox with ordinary browser security settings. Coverage includes relocation to a path with spaces, manual workflows, forms, keyboard behavior, themes, imports, storage failures, and actions after restore/undo.

Audio browser tests stub only browser device APIs in test code. The production application has no test globals; its actual analysis loop, stable-hold rules, tuning, gate, and recording path run unchanged. Tests also exercise permission denial, delayed permission, cancellation, reference playback, and device disconnection. Synthetic input cannot verify physical microphones, real permission prompts, speakers, or room acoustics.

## Classroom integration

The automatic classroom listener, temporary round queues, and responsive session workspace are integrated into the typed application. The static HTML and main.ts retain the upstream instance bootstrap.

## Automatic classroom listening

The DOM-independent `src/domain/classroom.ts` owns the quiet-gap gate, timed clap grouping, advance policy, and ordered roster navigation. The controller feeds it monotonic frame times, RMS amplitude, detected frequency, and explicit settings. Every completed attempt, navigation, pause, hidden tab, dialog, and reference playback resets the gate. A new turn requires 500 ms below the configured RMS noise gate, or 800 ms of settled unpitched background (the maximum RMS is at most 1.5 times the minimum). A detected sustained note is never learned as background; a short loss of pitch or an isolated impact cannot arm a turn. Gaps longer than 250 ms restart settling. This handles steady broadband room noise without raising the pitch gate or assuming that every undetected pitch is silence. Tonal machinery and severely masked instruments remain ambiguous.

Enabling the microphone starts automatic scoring. Auto Advance applies to both manual and microphone results: Until correct retries incorrect results; One and done advances any completed attempt. Navigation follows present roster order, stops at round completion, and never deletes attempts when going back. Random remains a separate fewest-attempts action. Undo covers navigation as well as scores. Round completion is temporary view state; restarting or revisiting a student allows another turn.

Clap navigation is opt-in and off on reopening. Short, loud, unpitched pulses (at most 180 ms, RMS at least 0.08 or four times the noise gate) are grouped with at least 180 ms separation and a 500 ms closing wait. Two navigate forward, three backward; other counts are ignored. Commands are suppressed during a tone hold, pause, reference playback, dialogs, and hidden tabs. They remain available at round completion. This is an acoustic heuristic, not speaker identification: physical classroom and microphone testing is still required to judge false detections.

The advance-mode and clap preferences, pause, and listener state are memory-only controls. The existing v1 Auto Advance boolean and attempt records are unchanged; no saved-data schema or migration is introduced. Unit tests cover the pure timing and navigation rules. Offline file-URL browser tests drive deterministic sine waves, noise bursts, and silence through the actual audio loop, covering retries, one-and-done, continuous-tone rejection, navigation, pause, round completion, and interruption boundaries.

## Responsive session workspace

`src/ui/classroom-view.ts` now owns the active session shell, content views, fullscreen integration, dashboard following, and targeted DOM updates through an explicit `SessionModel`. `src/app/classroom-controller.ts` coordinates the workspace with the current App instance. The initial screen stays in `src/ui/session-view.ts`; other views retain upstream typed controllers.

The session has persistent controls, a current-student display, and an independently scrolling dashboard. Split, Student, and Class are content choices, independent of browser fullscreen. The initial phone view is Student. Short windows, enlarged text, and expanded phone settings allow document scrolling as an accessibility fallback. Expanded settings on shorter displays omit the secondary tuner so feedback and controls remain readable. The microphone continues evaluating in every content view.

Cards retain stable nodes and patch only changed content, including checkbox state. Live audio writes only live indicators; ordinary renders preserve roster scroll and focus. Activation, resizing, and reopening a dashboard reveal the active card by changing only the roster's scroll offset. Manual browsing is left alone until the next activation. Filtered-out active students appear above the results; Show current student explicitly clears the filter/search. Instant scrolling also respects reduced-motion preferences.

Teacher details is a temporary display preference, off on reopening; it hides detailed attempt controls and note access from the student-facing dashboard. It is not access control. All controls continue to use the named delegated-event registry.

`src/domain/round.ts` owns whole-class/retry membership, per-round progress, and summary counts. A round snapshots existing attempt IDs so prior attempts do not count as new work. Retry membership uses the latest saved result and excludes absent or untested students. Skips remain separate from pitch attempts. Undo snapshots the queue, skip markers, completion state, and named result alongside existing session changes. Card, random, button, clap, and automatic navigation preserve historical attempts. Resuming, restoring, or switching sessions resets temporary round state; v1 persistence and backups are unchanged.

The session offers microphone selection after device enumeration becomes available, explicit input-level/signal feedback, and persistent permission/disconnection messages. Changing inputs stops the old stream and resets detection before requesting the selected device. Browser-default input remains available without enumeration. Fullscreen rejection or external exit preserves the selected content view and session data.

Verification includes phone, tablet, half-screen, desktop and projector-size viewports; long names/enlarged text; dashboard scrolling and focus retention; fullscreen success/failure; mocked device permission and switching boundaries; retry and skip/undo behavior; and existing audio, storage, backup, and baseline coverage. Physical room acoustics, clap reliability at distance, and real-device browser support still need classroom acceptance testing.

Retry navigation, including Random, stays within its queue. Nonmembers are labeled Not in this round rather than untested. Deliberately selecting or manually scoring a nonmember adds that student to the temporary round; Undo restores the previous membership.

All classroom callbacks are registered in `createBindings(app)` and resolve the live app on invocation. The workspace is created lazily per application instance and its resize/fullscreen listeners are disposed during hot replacement. Audio code retains generation checks for late permission requests, bound frame callbacks, and reference-tone cleanup. Classroom tests stub browser device APIs and use the Playwright clock; production exposes no app/test globals. Temporary round fields exist only on SessionState/undo snapshots and are never added to TrackerData or v1 backups.

## Noise-tolerant pitch scoring

The previous detector rejected synthetic A4 plus moderate broadband noise, and the old hold discarded all progress after any unreliable sample or pitch-spread outlier. Regression fixtures capture clean tones and those failing mixtures before the change; they are generated signals, not recordings of the reported vacuum.

`detectPitch` retains the target-independent [YIN approach](https://pubmed.ncbi.nlm.nih.gov/12002874/) and 55 to 1600 Hz search range. A two-pole Butterworth low-pass at 2 kHz reduces broadband energy; the first 3 ms of filter startup are discarded. The normalized-difference acceptance threshold changes from 0.12 to 0.18. This is a periodicity criterion, not a calibrated probability. The original input RMS gate still applies. No closest-target search or octave correction is used. Browser speech processing remains requested off; the application performs its own deterministic filtering. No new dependencies or runtime fetches are needed.

`PitchHold` integrates elapsed milliseconds, not frame counts, over the most recent configured hold duration. It requires a full observation window before saving, and credits only intervals bracketed by reliable observations of the same status within the configured pitch spread. Within each status, it finds the most-supported frequency band no wider than that spread. Correct results require 85% of the window in that band (1,700 ms in a 2,000 ms window). Low/high results retain the stricter requirement of a full window of stable evidence. The saved frequency is the time-weighted median of supporting measurements, evaluated against the current target and A4. It cannot average low and high into correct or combine different octaves for an exact-octave target. The current observation must agree with the winning band; a result is never completed during silence.

A missing-pitch interruption longer than 350 ms, a callback gap over 250 ms, or explicit cancellation clears evidence. Old evidence also ages out of the rolling window, so isolated short successes cannot accumulate indefinitely. Because credit needs two reliable endpoints, the practical tolerated dropout is slightly shorter than 15% of the window. Short hold settings necessarily have less interruption tolerance at the approximately 80 ms analysis cadence. The 85% rule is an internal policy; the existing hold and stability settings and v1 saved-data format are preserved. A settings change cancels evidence before applying the new target/tuning.

`PitchDisplay` uses a three-observation median for live feedback only, with a maximum 250 ms history and immediate clearing on unreliable input. Raw reliable frequencies feed scoring; display smoothing never supplies substitute evidence. Both objects belong to the current App instance and reset on cancellation.

### Regression from actual room recordings

The user's follow-up recordings exposed a separate harmonic-selection error that the initial sine/noise tests did not cover. A dominant fifth harmonic could meet YIN's absolute threshold before the fundamental was considered; the file labeled C produced approximately 1556 Hz instead of its approximately 311 Hz fundamental. The file labeled F Sharp also switched among harmonic-related candidates. The user confirmed a tuner transposition setting caused the mismatch between intended note names and the recorded sounding pitches. The detector must measure concert pitch, not compensate silently for that setting.

The detector now computes the complete difference curve. It chooses the shortest local-minimum period below both the absolute 0.18 threshold and the best normalized difference plus 0.02. Comparing candidate quality rejects a loud overtone whose period fails to explain the quieter components, while the 0.02 allowance avoids selecting unnecessarily long subharmonic periods because of small noise/interpolation differences. This remains a monophonic heuristic and is not a guarantee for arbitrary mixtures or absent fundamentals.

`tests/fixtures/recordings/README.md` documents independent spectral analysis and preparation of the three supplied recordings as compressed mono PCM, including original attachment hashes. Unit tests scan their full waveforms and add synthetic dominant third/fifth/seventh harmonics at several sample rates. Offline browser tests play all three through the real detection/scoring path with a 2-second hold. They verify correct saved results for measured sounding targets and incorrect results for the mismatched filename targets. Test audio is not part of the standalone release. Saved-data format and pitch-target math remain unchanged.

Unit coverage includes clean 55 to 1568 Hz signals at 44.1/48/96 kHz, harmonic-rich tones, noisy A at 44.1/48 kHz with several phases, noise alone, a transient, buried tones, bounded accumulation, persistent wrong notes, octave errors, alternating flat/sharp, varying frame rates, and callback stalls. Offline Chromium/Firefox tests drive the built release through mixed noise plus A, a noise burst mid-note, saved correct/low results, no duplicate results, background-only handoffs, and interruption/cancellation paths. Synthetic fixtures are repeatable acceptance cases, not a guarantee across room acoustics. Strong tonal machinery, competing players, microphone clipping, and a note drowned out by noise can still produce ambiguous or wrong pitches. A real-room follow-up should inspect the saved measured Hz/cents and verify the intended target and A4 before further threshold tuning.

## Graphical pitch and detection settings

`src/ui/pitch-settings.ts` renders and updates unsaved form drafts through delegated actions. Each instrument has note and octave selectors (including the existing any-octave behavior), a local SVG staff, and three native range inputs on a shared pitch axis. Vertically separated handles remain independently usable when their values coincide. Min/max are stored relative to the tuned target; moving Target preserves both tolerances. Fine scale spans ±200 cents, Wide ±1200; target tuning is limited to ±600 and each tolerance to the existing ±600. A narrower scale cannot hide existing bounds. Editing boundaries prevents crossing Target; untouched older configurations keep their original ranges.

The staff automatically chooses treble at C4 or above and bass below. A clef click overrides this for the current draft; Auto restores automatic selection. Clef and scale choices are presentation-only. Any-octave previews use octave 4, matching playback. Custom pitches show an explicit text indicator and cents offset; semitone-aligned offsets show On pitch. All staff geometry is inline SVG with no music font or asset fetch.

A4 tuning, hold duration, allowed spread, and noise gate use native sliders with visible values, units, endpoint explanations, and keyboard support. Settings are applied only on Save, which cancels active pitch evidence. Session/history labels and CSV exports include custom offsets. Offline Chromium and Firefox tests exercise the built HTML, note/clef changes, dragging and keyboard input, reload persistence, and actual custom-tone playback and measurement through the test audio-device boundary.

The treble and bass clefs use the Bravura U+E050 and U+E062 outlines (SIL Open Font License; see `docs/licenses/Bravura.txt`), converted to inline filled SVG paths with origins on the G4 and F3 staff lines respectively. Their engraved stroke contrast is preserved without shipping a font or adding runtime dependencies.
