# Classroom session experience implementation plan

Status: implemented. Automated verification covers the offline release; physical classroom microphone and projector acceptance remains a manual check.

## Outcome and working assumptions

Teachers can run a class while walking around the room. Students can clearly see whose turn it is, what to play, what the app heard, and what to do next. The session has three distinct regions: Session Behavior Settings, Current Student, and Students Dashboard.

Preserve the existing visual identity and offline, single-file release. Build on automatic listening, Until correct / One and done, quiet-gap protection, clap navigation, pause, and undo. Follow a test-first workflow for each feature: demonstrate a failing meaningful test, implement, then verify.

Assume the dashboard may be projected. Show names, turn order, and supportive progress by default; omit rankings, percentages, and teacher notes. Student history remains one deliberate icon action away and must not open automatically during navigation.

## 1. Characterize and separate the session UI

- Capture existing scoring, attendance, manual selection, automatic navigation, clap commands, pause/resume, undo, round completion, reload, and backup behavior before extraction.
- Extract session rendering and coordination from the inline controller into `src/ui/` behind explicit inputs and actions. Keep pitch/listening and queue rules in `src/domain/`, independent of DOM and persistence.
- Separate this behavior-preserving extraction from layout and feature changes. Avoid replacing the whole controller or unrelated Classes and History screens.
- Preserve element identity for audio updates and dashboard scrolling. Update live indicators and affected cards without rebuilding the full session on every frame or score.

Acceptance: characterization tests pass unchanged after extraction; switching views never changes the active student, records an attempt, or restarts a valid hold.

## 2. Build the responsive session shell

- Provide three content views: Split, Student, and Class. Provide a separate Full screen toggle for the selected view, with a clearly available exit.
- Session Behavior Settings is a compact region outside the student display. Keep Pause/Resume, Previous, Next, and Undo reachable in every view. Put Auto Advance, advance mode, clap navigation, microphone selection/status, and reference playback in an expandable controls area.
- Student view gives the available space to the current student. Class view gives it to the dashboard, retaining a compact current-student/status strip. Split shows both.
- Wide layouts place student and dashboard side by side; narrower layouts stack a compact student area above the dashboard. At phone widths, default to Student and provide an obvious switch to Class; retain an explicit Split choice where usable.
- Size the session to the available viewport. Only the dashboard roster scrolls during ordinary session use; keep its header/search and session controls fixed. Reduce secondary content before shrinking essential text or touch targets.
- Allow document scrolling as an accessibility fallback for extreme zoom, text sizes, or short landscape screens. Expanded settings must remain reachable without clipping.
- Keep view switching separate from the browser Fullscreen API. Handle rejected or unavailable fullscreen and browser-driven exit without losing session state. Full screen is optional for normal operation.

Acceptance: exercise 1920x1080, 1366x768, half-screen 680x900, tablet portrait/landscape, and phone 390x844 and 844x390. No horizontal overflow or clipped controls; normal layouts scroll only the dashboard. Test 200% zoom/text enlargement and long names. Each content view works with and without fullscreen.

## 3. Implement dashboard states and active-student following

- Use stable student identifiers for cards. Show name/instrument, current or up-next designation, and progress state with words plus visual cues.
- Treat turn position and outcome as separate facts: Current/Up next is not a result. Results include Not yet tried, Needs another try, Completed, Skipped this round, and Absent. One-and-done completion must not imply that an incorrect attempt was correct.
- Derive state from explicit round membership and attempts. Exclude absent students from navigation; keep them identifiable in the dashboard when requested.
- On activation through any route (card, button, keyboard, clap, auto advance, undo), scroll only the dashboard container enough to reveal the active card. Do not move keyboard focus.
- Preserve the teacher's manual scroll position during ordinary audio updates and rerenders. Follow again on the next activation. Provide Show current student.
- If search/filter hides the active student, show a compact active-student entry outside the filtered results; Show current student clears the conflicting search/filter and reveals their card. Do not silently overwrite a filter on every activation.
- Use reduced-motion preferences for scrolling and transitions. Recalculate visibility on resizing or reopening the dashboard.

Acceptance: test large rosters, offscreen activation through every navigation path, manual browsing, filtered-out active students, absence changes, empty results, resize, and reduced motion. Assert dashboard scroll changes without page scrolling or focus theft.

## 4. Clarify student feedback and microphone readiness

- Make the student's name the main heading, followed by instrument/target and a single prominent instruction.
- Map listening states to clear guidance: Microphone off, Waiting for quiet, Your turn - play, Keep holding, Try a little higher/lower, In range, Paused, and Round complete. Distinguish uncertain audio from an incorrect completed attempt.
- Retain the previous named result during handoff while clearly labeling the new current student. Start with a roughly one-second result display, independently of quiet-gap and fresh-hold eligibility; do not add unnecessary delay to the queue.
- Show a lightweight input-level indicator and distinguish no signal from signal with no reliable pitch. Do not claim that the app can identify the source of room noise.
- Offer an input selector where supported; otherwise use the browser's selected input. Switching devices resets detection safely. Give actionable permission-denied, disconnected-device, and unsupported-device messages while preserving manual scoring.
- Provide text-based feedback, adequate contrast, large touch targets, and restrained status announcements. Do not announce every pitch frame or use color alone. Do not add audible feedback that could score itself.

Acceptance: synthetic audio tests cover silence, noise, steady pitches, unstable holds, handoffs, and interruption. Browser tests cover named result attribution, mic errors and device changes at the device boundary, accessible status text, and paused input. Real microphone testing remains a separate hardware acceptance check.

## 5. Strengthen teacher recovery and round workflows

- Keep two claps forward / three back opt-in, with a visible, named acknowledgment of each accepted command. Preserve the quiet gap, grouping delay, and pause behavior.
- Previous revisits a student without deleting results. Undo reverses the last score or navigation and restores the relevant round position. Manual scoring follows the selected advance policy.
- Introduce an explicit round queue for Whole class and Retry students needing practice. Define retry membership from present students whose latest completed result is incorrect; identify skipped or untested students separately so they are not silently treated as successful.
- On completion show distinct counts for attempted, correct, needs practice, and skipped/untested. Offer Retry students needing practice, Another round, and Finish session. Disable empty retry actions with explanatory text.
- Starting a retry round selects only its members. Another round uses all present students. Neither action erases previous attempts. Going back intentionally permits another attempt, including in one-and-done mode.

Acceptance: test mixed results, all correct, all absent, one student, skipping the last student, returning after completion, retry subsets, corrections affecting retry eligibility, and undo across a handoff. A held note or clap burst must never create a pitch result for another student.

## 6. Preserve data and document boundaries

- Keep layout, expanded controls, and fullscreen as UI state. Preserve the existing v1 saved-data format during UI extraction and layout work.
- Initially keep round queue and skip markers in memory, consistent with current round-completion state. Historical attempts remain saved; after reopening, explain that a custom retry round must be restarted rather than pretending it resumed exactly.
- If resumable round queues or permanent skip history are required, make that a separate versioned saved-data change with migration, export/import round-trip, and invalid-import preservation tests before implementation. Do not add fields incidentally.
- Update Help and `docs/architecture.md` with view behavior, display privacy, round semantics, device limitations, and persistence boundaries. Add no runtime network dependencies.

## Delivery and verification

Implement in order: characterization/extraction; responsive shell; dashboard following; feedback/device readiness; round workflows. Keep each step reviewable and test-first.

Run `npm run verify` before delivery. All browser checks must use the built `dist/index.html` under offline `file://` with ordinary security settings in Chromium and Firefox. Include existing storage failure, backup, manual scoring, and upstream-baseline protections. Build the release through the existing bundler; never edit dist by hand.

Perform one batched visual review at the representative sizes and both content/detail modes, fix the findings together, then confirm once. Check real classroom hardware for projected readability, microphone distance, room noise, double/triple clap discrimination, sustained-note rejection, and recovery while walking around. Report any untested hardware behavior explicitly.
