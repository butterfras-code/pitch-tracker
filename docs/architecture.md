# Architecture and acceptance goals

## Release contract

Users double-click one HTML file. Node and npm are development tools only. The production artifact contains its JavaScript, CSS, and assets and must work without a local server or network access. Vite with vite-plugin-singlefile performs packaging. Assets must be imported through the module graph; do not use a public directory for external release assets.

## Stack and boundaries

TypeScript with strict checking, Vite, Vitest, Playwright, ESLint, and Prettier. No UI framework is needed for the initial extraction.

As the existing source is imported, extract pure rules and models into src/domain, storage adapters into src/persistence, and DOM rendering/event handling into src/ui. src/main.ts wires the application together. Create these modules when actual code is available rather than inventing abstractions in advance.

Vitest covers rules, state transitions, validation, and migrations. Playwright exercises the release under file:// in Chromium and Firefox, including offline launch from a copied file with spaces in its path. Unit tests characterize the existing note parsing, cents boundaries, octave handling, pitch detection, and packaging. Browser tests cover scoring, undo, attendance, reload, themes, backup restore, and the real audio loop with synthetic input to verify gate, tuning, and automatic recording.

## Measurable guard rails

1. Standalone: one output HTML file, launches after copying to a different directory, with browser networking disabled and no external requests or script errors.
2. Behavior: record the existing primary tracking workflow, representative calculations, and boundary cases before extracting their implementation.
3. Data integrity: preserve existing data; test save/reload, export/import equivalence, supported migrations, and malformed import rejection before modifying persistence.
4. Modularity: domain logic is independently testable without DOM or browser storage.
5. Reproducibility: npm ci followed by npm run verify succeeds with the documented Node version and installed test browsers.
6. Scope: preserve behavior during modularization; discuss new features separately.

## Existing persistence

Browser storage for file URLs varies by browser and file location. An HTML file does not automatically contain data saved through browser storage. The existing app uses mouthpiece.pitchtracker.v1 in localStorage with schema 1, revision conflict protection, validated replacement imports, and JSON backup downloads. Preserve these protections. Do not promise persistence across moving the HTML file.

## Module boundaries and migration

The upstream baseline remains unchanged in Pitch-Tracker.html. The source index.html retains the classic controller, render functions, and lexical state; src/styles.css is extracted and inlined at build time. The next step is to move the controller and rendering into modules, now that DOM event attributes no longer depend on global function names.

Pitch parsing, cents evaluation/classification, and detection live in src/domain/pitch.ts with explicit tuning and gate inputs. Unit tests import the module directly. Thin controller wrappers delegate without duplicating pitch math.

TrackerData and v1 types live in src/domain/tracker.ts. Pure validation/parsing lives in src/domain/backup.ts, preserving valid v1 fields without normalization or migration. src/persistence/tracker-store.ts owns load, revision checks, save, and recovery-backed restore through KeyValueStorage. browser-storage.ts accesses localStorage lazily so denied access is handled inside load/save. The UI still owns confirmation dialogs, downloads, file-size checks, and blocked-save warnings. Theme preferences remain separate.

A failed save leaves the in-memory revision unchanged. Restore replaces UI state only after successful storage writes. Recovery and primary writes are separate operations: a failed primary restore may update the recovery copy but preserves primary data. Revision checks detect known stale writers; they are not an atomic cross-window lock.

src/main.ts injects domain and storage services into the temporary startTracker bridge after HTML parsing. The controller loads/validates saved data, renders, and returns an explicit action registry. The entry point then binds the UI listeners once. Type checking covers extracted modules, tooling, and tests; the remaining classic controller is not yet type checked.

## UI event contract

src/ui/events.ts delegates click, change, input, and submit events from document. Static markup and generated views use data-ui-click, data-ui-change, data-ui-input, and data-ui-submit with named actions. IDs and other arguments are separate data attributes. Only registered actions execute; no event-attribute JavaScript, eval, or string-to-function conversion is used.

The controller supplies closures over its current state. The listener resolves the nearest action control, handles nested button content, ignores disabled controls, and supplies current form values, checked state, and data attributes. It prevents native navigation for registered form submissions while retaining browser validation and Enter submission. Delegation survives innerHTML replacement without rebinding; bindUiEvents also returns a disposer for future remounting. Theme, keyboard, visibility, and storage listeners already used addEventListener and retain their existing behavior.

Browser tests cover class creation/rename, roster edits/archive, custom targets/settings, search/filter, focus view, notes, next/random selection, advance, history correction/deletion/resume, downloads/import picker, keyboard behavior, unknown actions, disabled controls, and repeated rerenders. Release checks reject inline UI event attributes.

Vite embeds the module bundle and CSS in dist/index.html. The release remains one HTML file with no runtime imports or adjacent files. Real microphone permission and hardware behavior require manual browser checks.

## Persistence verification

Unit tests cover v1 round trips, malformed records and relationships, invalid targets/settings, corrupt storage, denied reads, failed saves, stale revisions, recovery-copy preservation, and restore write failures. Browser tests inject denied access, quota errors, corrupt records, and newer revisions under file URLs and verify that manual tracking remains usable and prior stored data is preserved. Physical microphone behavior still needs manual verification.
