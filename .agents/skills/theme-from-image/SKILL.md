---
name: theme-from-image
description: Create or refine a Pitch Tracker theme from a supplied image or mockup, translating its visual character into bundled theme tokens and decoration while preserving the shared layout.
---

# Theme from an image

Create a working theme in this repository, not another mockup. Preserve the reference's distinctive visual character: materials, lettering, patterns, borders, depth, and motifs as well as its palette. A bright reference should result in an expressive theme, not just a recolored generic interface.

## Establish the brief

Inspect the supplied image before implementing. If it is available only as a local attachment, open it with an image-viewing tool. Identify the dominant surfaces, action colors, typography, texture, decorative motifs, and treatment of success and pitch feedback. Explain the intended visual direction briefly.

Ask for clarification when missing information would materially change the result and cannot be inferred from the conversation. For example:

- If several images are supplied without direction, ask which is primary or whether to combine them.
- If the reference is unavailable or illegible, ask for an accessible copy rather than inventing its appearance.
- If it is unclear whether to replace an existing theme or add a variant, ask which outcome is intended.
- If the requested visual identity conflicts with a stated constraint, describe the conflict and ask which should take priority.

Use the user's exact theme name when supplied. Otherwise choose a reasonable display name and stable kebab-case ID, stating the assumption; ask about naming only when it matters. Do not require a design interview or approval for routine implementation choices. Continue independent inspection while awaiting answers, but wait before implementing choices that depend on required clarification. Existing authorization and explicit user instructions take priority over this workflow.

## Read the current implementation

Paths below are relative to the repository root. Read `AGENTS.md`, `THEMES.md`, `src/themes/contract.ts`, `src/themes/theme.template.ts`, and `src/themes/pitch-press.theme.ts`. Consult `docs/themes.md` for implementation guidance, checking its descriptions against current code if they disagree.

Inspect `src/themes/registry.ts`, `src/ui/themes.ts`, `src/main.ts`, and the relevant shared styles before changing integration. Choose a nearby example for decoration: Pitch Press for print, Lisa Lives for rainbow artwork, Vintage Audio for worn equipment, or Boom Pow for comic ink and halftones. Read the corresponding `.theme.ts` and `.css`, rather than copying an entire theme blindly.

Check Git status before editing. Preserve unrelated work. If another session is actively editing shared files, coordinate or isolate the change; do not capture unfinished work in a theme commit.

## Translate the reference into the shared UI

Map reference features onto existing surfaces: page background, panels, concert target, live tuner, playback button, navigation, roster cards, and recorded results. Keep musical notation and functional text real and readable. Do not bake pitch values, student names, buttons, or the complete mockup into an image.

Full Screen Split View is the primary experience. `src/session-layout.css` owns session geometry and `src/header-layout.css` owns header geometry. Theme work changes appearance, not component order, visibility, spacing, breakpoints, hit targets, staff geometry, or scoring behavior. Do not reproduce a reference's different layout by hiding, reordering, or duplicating controls. Ask before expanding the scope if the user actually requests a structural redesign.

1. Add `src/themes/<id>.theme.ts` using the template, a unique ID, the chosen name, and `satisfies ThemeDefinition`. Definitions are discovered at build time; do not maintain a second registry list.
2. Use the current contract's tokens for surfaces, foregrounds, semantic states, typography, patterns, borders, shadows, focus, and supported effects. Omitted values inherit shared defaults. Choose an existing treatment only when its shared decoration is appropriate.
3. When tokens alone cannot express the reference, add `src/themes/<id>.css` and import it from `src/main.ts` in the established order. Scope theme-specific decoration under `:root[data-theme='<id>']`. Keep reusable appearance values in tokens; avoid theme-specific literals in shared UI rules. A token extension needs a shared consumer and validation, not just a new key.
4. Use CSS or small vector decoration for simple halftones, stripes, bursts, highlights, and bevels. Use local bitmap artwork when material texture or illustration is central to the reference. If image generation is available and useful, follow its skill/tool instructions and generate decorative assets, not a replacement screenshot of the app. If an essential asset cannot be produced with available tools, explain the limitation and clarify the acceptable alternative.
5. Bundle images and fonts from `src/assets/` through theme CSS. Include applicable font/asset license records in `docs/licenses/`. No CDN, remote font, runtime fetch, or dependency is required for an ordinary theme. Merely naming a font does not bundle it.

The token validator rejects `url(...)` and `@import` values, including local/data URLs. Reference local artwork directly from bundled CSS. Large inlined images can also exceed browser limits when routed through custom properties or declarations containing `var()`; keep large image URLs in their own direct `background-image` declaration and layer token-driven color separately.

Decorative pseudo-elements must not intercept input, obscure labels, or add scrolling. Keep pitch-state meaning, disabled states, focus visibility, and readable contrast intact. Use display lettering selectively where longer names and instructions remain legible. Respect reduced motion for animations. If theme-specific feedback wording is requested, inspect the current feedback catalog and validator; customize supported wording/appearance without changing timing, controller behavior, or saved data incidentally.

## Verify and refine

Run `npm run verify` as required by `AGENTS.md`. Add or adapt meaningful theme browser coverage using existing theme tests as examples. Build the release and check `dist/index.html` under `file://`, offline, with ordinary browser security settings; do not edit the release by hand.

Inspect actual screenshots, not only computed token values. Compare the implementation with the reference's defining visual features and strengthen any missing material, lettering, or decoration. Check:

- Full Screen Split View at 1366×768 and 1920×1080, plus a phone viewport around 390×844.
- Student and Class views, scrolling roster, long names, settings/dialogs, and low/correct/high results.
- Keyboard focus, disabled controls, readable notation and live readings, and reduced motion where applicable.
- Switching from the new theme to another and back: no leaked decoration, session reset, lost settings draft, or altered layout.
- Bundled artwork/fonts render without network requests and without horizontal or unintended document scrolling.

Keep builds isolated from concurrent browser runs or other sessions that are changing shared files. Investigate failures and report unresolved ones honestly; do not change audio/controller behavior just to make a theme test pass. Repeat checks when fixes or unresolved concerns justify them.

Update `THEMES.md` with the theme's name, visual identity, and asset approach. Document architectural changes only if any were necessary. Summarize the implemented theme, validation, and material limitations. If committing is authorized, commit the theme and its required assets, integration, docs, and tests together while excluding unrelated or explicitly deferred work.
