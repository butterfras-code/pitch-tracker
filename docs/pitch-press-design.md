---
name: Pitch Press
description: A concert-pitch practice poster in letterpress ink on warm paper.
colors:
  paper: '#FFF4D6'
  ink: '#151515'
  muted: '#595348'
  vermilion: '#e63212'
  poster-yellow: '#ffe500'
  correct-background: '#FFE600'
  cobalt: '#0645FF'
  primary-hover: '#1733B5'
typography:
  masthead:
    fontFamily: '"Pitch Press", Impact, sans-serif'
    fontSize: 'clamp(3.8rem, 7.3vw, 8rem)'
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '-0.035em'
  concert-note:
    fontFamily: '"Press Slab", Georgia, serif'
    fontSize: 'clamp(7rem, 16vw, 15rem)'
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: '-0.035em'
  body:
    fontFamily: 'Arial, Helvetica, system-ui, sans-serif'
rounded:
  surface: '0px'
  control: '0px'
---

# Design System: Pitch Press

## Overview

Pitch Press is a bold printed band-practice poster: oversized slab concert note, condensed black/vermilion masthead, warm grain paper, cobalt playback, and a yellow distressed result stamp. This document describes only the implemented `pitch-press` theme and `print` treatment; it is not a design system for the other themes.

The authoritative implementation is [pitch-press.theme.ts](../src/themes/pitch-press.theme.ts), [pitch-press.css](../src/themes/pitch-press.css), the shared [classroom view](../src/ui/classroom-view.ts), and the masthead in [index.html](../src/index.html). The stylesheet owns decoration and bundled assets; the theme definition remains typed palette and typography data.

## Colors

Paper and ink carry the page, rules, borders, and body text. Vermilion marks “Tracker,” the active navigation underline, low meter graduations, and the stamp border. Cobalt identifies Hear target and Next, with cream text. Listen again, the selected student, and the matched panel use poster yellow. The closely related correct-background token remains distinct from the decorative poster yellow.

Semantic low/high feedback retains the theme's vermilion/cobalt pairs. Muted copy stays readable on paper; the live measurement remains visually separate from the concert target.

## Typography

Anton is bundled as `Pitch Press` for the masthead, condensed uppercase labels, actions, and frequency. Alfa Slab One is bundled as `Press Slab` for the oversized concert note. The octave is a subordinate Anton numeral at `0.2em`; accidentals remain part of the note. Body copy and live Hz/cents use the system sans stack.

The desktop masthead and concert-note scales are recorded above. Concert frequency uses `clamp(2.5rem, 5vw, 4.5rem)`. Below 600px the masthead uses `clamp(3rem, 13vw, 4.8rem)` and the note is `8rem`. Fonts are local assets with SIL Open Font License notices in `docs/licenses/`.

## Layout

The active session allows document scrolling, with a centered maximum width of 1440px and an 18px shell gap. Student view constrains the current display to 800px. Student identity precedes the centered target, playback, ruler tuner, feedback, and paired actions. Split retains the roster; Class hides the poster, paired actions, and tuner. Roster cards have an 850px maximum height in this treatment.

Below 600px the content stacks vertically, the masthead controls wrap, and tuner/button padding contracts. Scrolling accommodates large text and the poster without clipping controls. Browser printing hides the poster playback and paired actions.

## Elevation & Depth

Depth comes from hard ink offsets and printed texture. Theme panels use `4px 4px 0 #151515`; ordinary surfaces/buttons use `3px 3px 0 #151515`. Hear target has an `8px 10px` hard shadow, paired actions `7px 9px`. Enabled pressed buttons translate by `2px 2px` and use the theme's smaller pressed shadow.

Deterministic paper-grain PNG texture covers paper surfaces and buttons. A repeating ink-mask PNG distresses the masthead and matched lettering. The single-file build inlines both textures and fonts; none require runtime requests.

## Shapes

Surfaces, controls, badges, and progress tracks have square corners. Heavy black rules establish hierarchy: 8px below the masthead, 5px around Hear target, and 4px around tuner, result panel, and paired actions. The meter's circular yellow needle marker is the deliberate exception to the rectangular forms. The matched stamp uses a 7px double vermilion border and a −5-degree rotation.

## Components

- **Masthead:** black “Pitch,” vermilion “Tracker,” distressed ink, and a ruled “For better bands” tag. The title remains Pitch Tracker in every theme; Pitch Press names the theme only. Theme selection and backup remain real controls.
- **Concert target:** labeled explicitly, with note, octave, and frequency to one decimal place. Frequency comes from the same `targetFrequency` calculation as playback, including A4 tuning and custom offsets; an offset also gets a text label.
- **Playback and navigation:** cobalt Hear target with inline speaker SVG; yellow Listen again and cobalt Next with inline arrow SVG. These use the existing delegated reference-tone and next-student actions. Paired actions disable when no target is available.
- **Ruler tuner:** low/center/high labels, colored graduations, black center line, and yellow needle marker decorate the existing live meter. Measured note, Hz, cents, hold progress, and microphone signal remain available.
- **Matched stamp:** appears only when the latest saved attempt for the current student in the current round is correct. Attempts in the round baseline are excluded. Navigation to a student without a new attempt clears the stamp; decoration never creates a result or runs on a timer. Existing status text supplies the readable result alongside the decorative lettering.
- **Teacher workspace:** roster, scoring, settings, and round controls keep their existing functions. Switching away from the print treatment hides all print-only additions without rebuilding the session.

## Do's and Don'ts

- Do preserve the oversized slab target, condensed masthead, warm paper, strong rules, and distinct playback/result colors.
- Do keep concert target and measured microphone feedback explicitly separate.
- Do retain keyboard focus, disabled behavior, real classroom controls, and responsive scrolling.
- Do build assets into the standalone offline `dist/index.html`; edit source rather than the release.
- Don't change scoring, audio behavior, or v1 saved data to implement decoration.
- Don't let a previous round's correct attempt produce the current round's matched stamp.
- Don't extend this theme's visual rules to other themes by default.
