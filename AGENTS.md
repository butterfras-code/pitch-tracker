# Development guard rails

- The release is one self-contained `dist/index.html`, opened by double-click under `file://`. No server, installation, internet, CDN, remote fonts, or runtime asset fetches.
- Keep source modular; bundle JavaScript, CSS, and assets into the release. Do not edit dist by hand.
- Preserve existing behavior during extraction. Capture representative behavior before changing domain logic. Separate feature changes from refactoring.
- Domain modules must not depend on the DOM, browser storage, or UI. Put persistence behind explicit interfaces; UI coordinates those interfaces.
- Saved-data changes require a versioned format, migration tests, and export/import round-trip tests. Invalid imports must not overwrite valid data. Do not assume file-URL storage survives moving or renaming the HTML file.
- Use hash navigation if routing becomes necessary. Do not introduce server routes or service-worker requirements.
- Run `npm run verify` before delivering changes. Browser checks must exercise the built HTML under file URLs, offline, with ordinary browser security settings.
- Test meaningful behavior and failure cases. Do not add placeholder domain tests or treat the tooling smoke test as functional app coverage.
- Keep dependencies intentional and lockfile committed. Document architectural decisions in docs/architecture.md.
- Pitch-Tracker.html is the unchanged upstream baseline. Develop in index.html and src/. The app is strictly typed and bootstrapped from src/main.ts. Keep callbacks bound to the current application instance and extend browser coverage when changing controller or audio behavior. Do not change the v1 saved-data format incidentally.
