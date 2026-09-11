# Pitch Tracker themes

The canonical themes are **Cel-Shaded Mech** (default) and **Pitch Press**, with **Big Button Sound Club** as a toy-inspired variant. Build with `npm run build`, then open `dist/index.html` directly. All work offline with all fonts and artwork bundled into the HTML.

All themes use the same session components and layout: a collapsible left sidebar, student identity, concert target and playback, live tuner, feedback, a scoring/navigation footer, and an internally scrolling grid of student cards. Student, Split, and Class modes are controlled by the session, not by the theme. Theme switching changes appearance without rebuilding the UI or interrupting a pitch check.

`src/session-layout.css` owns session structure, component visibility, sizing, and responsive behavior. Theme definitions in `src/themes/` supply palette and typography tokens; treatment CSS supplies visual decoration. Theme styles must not add a different session flow or document scrolling. Classic and Nocturne have been removed.

## Theme development

Copy `src/themes/theme.template.ts` to a new `*.theme.ts` file only when adding an intentional new theme. The build discovers definitions automatically. `src/themes/contract.ts` validates their appearance tokens and supplies defaults. Use Cel Mech and Pitch Press as the canonical examples; see [the theme contract](docs/themes.md) for details.

Theme preferences use `mouthpiece.pitchtracker.theme.v1`, separately from tracker records. Backups contain tracker data, not appearance preferences. The v1 tracker format is unchanged.

## Big Button Sound Club

Select **Big Button Sound Club** in the Theme picker for cream molded surfaces, recessed navy displays, red playback, cobalt actions, yellow accents and green success feedback inspired by the supplied toy mockup. `src/themes/big-button.theme.ts` supplies existing contract tokens; `src/themes/big-button.css` adds paint-only toy decoration. Layout, copy, music artwork and behavior remain shared. System font stacks preserve offline operation without new assets.

## Lisa Lives!

Select **Lisa Lives!** for the neon mockup-inspired variant: rainbow leopard/zebra print, a holographic leopard sticker, hot-pink playback, cyan candy controls and lime center feedback. The theme preserves shared layout and content, including Full Screen Split View. Paint uses theme tokens; two local generated PNG assets are bundled into the standalone HTML. No runtime requests or new dependencies are required.

## Vintage Audio

**Vintage Audio** uses worn black amplifier tolex, recessed ivory target lettering, amber instrument illumination and deep-red switches. The studio treatment preserves shared session layout and live meter behavior. Its local generated texture and existing bundled condensed font work entirely offline.

## Boom Pow

**Boom Pow** turns the shared workspace into a pop-art comic: cyan Ben-Day print, yellow bursts, black ink outlines, ivory panels and red playback. Bangers provides comic lettering while body copy stays readable. Artwork and font are bundled offline; layout and live meter behavior stay shared.
