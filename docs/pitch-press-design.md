# Pitch Press

Pitch Press treats the shared workspace as a letterpress ledger: cream cardstock,
heavy slab headings, condensed navigation, tightly set monospace data, and
mechanical grading slugs. Fullscreen Split remains the primary composition.

## Type and materials

The existing bundled Alfa Slab One (Press Slab) sets the masthead, student names,
and concert note. Anton (Pitch Press) sets navigation and grading labels.
Courier New / Courier / monospace sets instrument metadata, Hz, cents, and
target captions with tabular numbers and a restrained ink-weight shadow.
Body copy keeps the readable system sans stack.

The bundled paper grain sits beneath a translucent cream wash on containers.
Inset shadows suggest compressed cardstock; a hard ink offset anchors the main
display. Student cards use double ink rules, with yellow marking the selection.
The black concert-target block retains red framing rules and cream text.
All assets are inlined into the standalone release.

## Controls and feedback

Grading controls have square two-pixel ink borders and hard offset shadows.
Pressing a control moves it down three pixels and compresses its shadow.
Live low, in-range, and high states fill with brick, forest, and navy inks,
respectively, with cream lettering. A brief, single stamp strike accompanies
live range activation. Prior attempts retain their ink color without replaying
the strike. Reduced-motion preferences suppress animation and transitions;
keyboard focus remains a separate visible outline.

The functional pitch meter uses alternating major and minor black rules,
a stronger center rule, and a red pointer blade. Its position still comes from
the existing measured pitch. Yellow remains a decorative paper/selection accent.

## Boundaries and validation

Theme tokens own palette, type, and shadows; pitch-press.css owns scoped material
and mechanical decoration. Shared session layout, audio, scoring, persistence,
and navigation remain unchanged. No runtime assets or new dependencies are used.

Offline browser coverage exercises the built file at phone, laptop, and desktop
sizes, including fullscreen Split, roster scrolling, range inks, reduced motion,
focus, playback, recording, and switching themes.
