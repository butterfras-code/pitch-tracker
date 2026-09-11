# Adding a theme

Current status: all appearance tokens, including the 12 new tokens, have shared CSS consumers. The print treatment is implemented for Pitch Press; the toy treatment is implemented for Big Button Sound Club; the six other non-mech treatment names still await decorative CSS. See [Pitch Press design](pitch-press-design.md) for its scoped visual system. See the handoff section below before building reference-inspired themes. Use this guide together with `src/themes/contract.ts`, the authoritative key/default/type definition.

1. Copy `src/themes/theme.template.ts` to `src/themes/my-theme.theme.ts`.
2. Give it a unique lowercase kebab-case `id` and a display `name`.
3. Set values in `tokens`. Keep `satisfies ThemeDefinition` for editor completion and typo checking.
4. Run `npm run verify`. Open `dist/index.html` and select the new theme.

Every `*.theme.ts` in that folder is discovered at build time. No registry edit, server, runtime file loading, or dependencies are needed. The template itself is excluded. Rename the file freely; keep the ID stable to preserve saved selection. Removing a selected theme falls back to Cel-Shaded Mech. Theme preferences remain separate from v1 data backups; moving the HTML may lose browser storage.

## Appearance contract

`src/themes/contract.ts` is the complete list of accepted values and defaults, including the appearance extensions documented below. Missing keys always inherit these defaults, never the previously selected theme. The table here covers tokens with existing CSS consumers. The two canonical definitions are `cel-mech.theme.ts` and `pitch-press.theme.ts`. Both use the same session structure; copy `theme.template.ts` only for an intentional new theme.

| Tokens                                                                                                              | Purpose                                                        |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `bg`, `card`, `control`, `ink`, `muted`, `line`, `accent`, `soft`                                                   | Main surfaces, text, borders and interaction colors            |
| `primary-ink`, `primary-hover`, `danger`, `focus-ring`                                                              | Action text, hover, destructive actions and keyboard focus     |
| `low`, `low-bg`, `correct`, `correct-bg`, `high`, `high-bg`                                                         | Pitch feedback foreground/background pairs                     |
| `badge-bg`, `help-bg`, `track`, `notice-bg`, `notice-ink`, `backdrop`                                               | Secondary surfaces, progress and dialog overlay                |
| `radius`, `control-radius`, `display-radius`, `badge-radius`, `help-radius`, `toast-radius`                         | Panel, control, current-student, badge, help and toast corners |
| `panel-shadow`, `button-shadow`, `surface-shadow`                                                                   | Panels/dialogs, buttons, current-student/settings surfaces     |
| `body-font`, `heading-font`, `heading-style`, `heading-transform`, `heading-shadow`, `note-shadow`, `button-weight` | Typography and display decoration                              |
| `page-pattern`, `surface-pattern`, `control-pattern`, `surface-border-style`                                        | CSS gradients/patterns and surface border style                |
| `slider-track`, `slider-band`, `slider-handle`, `slider-target`                                                     | Pitch editing track, accepted interval and handles             |
| `scheme`                                                                                                            | Native browser light/dark controls                             |
| `edge`, `highlight`                                                                                                 | Accents for the preserved legacy mech treatment                |

Values are CSS strings. Use system/local font stacks and CSS gradients; URL assets and imports are rejected. Type checking catches unknown keys, while registry tests catch duplicate IDs, empty values and URL references. This is a developer-authored configuration, not an untrusted CSS sandbox or full CSS-value validator. Verify contrast, keyboard focus and readable feedback pairs when authoring a palette.

Layout, spacing, font sizes, responsive breakpoints, hit-target sizes, SVG paths, staff geometry, and scoring semantics are intentionally outside the theme contract. Fonts can affect wrapping, so inspect desktop and phone sizes. Omit `treatment` for a token-only theme, or select one of the treatment names documented below. Currently `mech`, `print` and `toy` have specialized CSS. Print output keeps the existing legibility overrides; browser printing is separate from the Pitch Press `print` treatment.

## Handoff: reference-style contract extensions

All 12 additions below are now consumed by the shared CSS. Another agent can author theme files using these values immediately. The `mech` and Pitch Press `print` treatments have specialized rendering rules; the other treatment names are accepted and set `data-treatment`, but their decoration still needs implementation. Pitch Press adds a build-owned poster presentation; music artwork remains shared.

| New token               | Default            | CSS consumer                                                                 |
| ----------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `card-ink`              | `var(--ink)`       | Panels, student cards, current-student surface, settings surface and dialogs |
| `control-ink`           | `var(--ink)`       | Ordinary control text; semantic action/result colors keep priority           |
| `display-bg`            | `var(--card)`      | Inner `.tuner` background; the outer student panel stays on `card`           |
| `display-ink`           | `var(--card-ink)`  | Inner `.tuner` text and meter needle                                         |
| `data-font`             | `var(--body-font)` | `#liveHz`, `#liveCents`, `.range-readouts b`, detection outputs              |
| `label-font`            | `var(--body-font)` | `label` elements                                                             |
| `heading-weight`        | `700`              | `h1`, `h2`, `h3`                                                             |
| `label-weight`          | `600`              | `label` elements                                                             |
| `label-tracking`        | `normal`           | Label letter spacing                                                         |
| `label-transform`       | `none`             | Label capitalization                                                         |
| `display-shadow`        | `none`             | Recessed/raised pitch-reading display                                        |
| `button-pressed-shadow` | `none`             | Enabled pressed buttons, with legacy mech behavior preserved                 |

Palette and font references follow existing theme overrides instead of hard-coding Classic colors into dark themes. Label typography affects labels; nested inputs, selects and textareas retain their body font, original weight and normal capitalization/tracking so entered values are not transformed. Musical note text and summary statistics retain `heading-font`; only the listed numeric readings use `data-font`. Merely naming a font does not bundle it.

Primary actions, destructive actions, low/correct/high results, active view buttons and tabs retain their semantic colors. Tuner hints inherit `display-ink` so a dark display can remain readable inside a light card. Secondary text outside the tuner still uses `muted`. Empty-state panels retain their muted text. Disabled buttons do not receive the pressed shadow; navigation tabs and student-name controls retain their existing decoration. Keyboard focus styling remains independent of shadows.

The existing Cel-Shaded Mech definition now explicitly sets `display-bg: 'var(--help-bg)'` and `display-shadow: '4px 4px var(--edge)'`, replacing its former hard-coded treatment values. Its highlighted note lettering, button movement and other legacy decorations remain intact. When authoring a different `mech` definition, set display tokens explicitly if that legacy appearance is wanted. The display surface may now be opaque; set `display-bg: 'transparent'` if the card pattern should show through.

`ThemeTreatment` is exported from `contract.ts`, derived from `THEME_TREATMENTS`:

- `mech`: existing Cel-Shaded Mech treatment.
- `print`: Pitch Press / printed outlines and stamp decoration.
- `comic`: Sonic Boom / halftone and comic decoration.
- `studio`: Take One / recessed studio equipment.
- `modular`: Field Unit 440 / compartment and equipment decoration.
- `toy`: Big Button Sound Club / molded surfaces and controls.
- `rave`: Prism Patrol / neon and glossy decoration.
- `roadcase`: Pitch Crew / metal and tape decoration.
- `arcade`: Dead Center / painted trim and marquee decoration.

Each theme remains one `*.theme.ts` file with `{ id, name, treatment?, tokens } satisfies ThemeDefinition`. The `print` reference treatment is implemented in `src/themes/pitch-press.css`; the toy treatment is implemented in `src/themes/big-button.css`; the six other reference treatments still await decorative CSS. Do not add layout or asset-URL fields. No `meter` selector is exposed yet: alternate renderers must be implemented against the shared assessment state before advertising that capability.

Runtime validation now rejects unknown treatments, schemes other than `light`/`dark`, malformed definitions, unknown top-level fields and token keys, and every `url(...)` or `@import` value (including local/data URLs). The error wording is `Invalid or disallowed theme token`. General CSS syntax and font availability still require build/browser verification.

## Canonical session structure

Cel-Shaded Mech and Pitch Press are the canonical themes; Big Button Sound Club is an additional toy variant. Classic and Nocturne definitions were deleted without a migration layer. Shared session components use neutral classes (`session-target`, `target-pitch`, `target-playback`, `meter-labels`, and `student-actions`). `src/session-layout.css` determines visibility, flow, and viewport bounds for both. Themes may paint these components but must not hide them or reorder the session. Class mode hides the target, tuner, and quick actions for both themes; Student and Split show them.

### Live pitch range effects

Set the `range-animation` token in a `.theme.ts` file to a CSS animation shorthand: `range-glow 1.4s ease-in-out infinite alternate`, `range-wiggle 700ms ease-in-out infinite`, `range-sparkle 1.2s ease-in-out infinite`, or `none`. The matching live range button receives the effect and a static outline. Reduced-motion preferences retain only the outline. New keyframes belong in bundled CSS; this token does not change scoring or saved data.
