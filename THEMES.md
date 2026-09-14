# Pitch Tracker themes

The available themes are **Big Button Sound Club** (default), **Pitch Press**, **Lisa Lives!**, **Vintage Audio**, and **Boom Pow**. Build with `npm run build`, then open `dist/index.html` directly. All work offline with all fonts and artwork bundled into the HTML.

All themes use the same session components and layout: a collapsible left sidebar, student identity, concert target and playback, live tuner, feedback, a scoring/navigation footer, and an internally scrolling grid of student cards. Student, Split, and Class modes are controlled by the session, not by the theme. Theme switching changes appearance without rebuilding the UI or interrupting a pitch check.

`src/session-layout.css` owns session structure, component visibility, sizing, and responsive behavior. Theme definitions in `src/themes/` supply palette and typography tokens; treatment CSS supplies visual decoration. Theme styles must not add a different session flow or document scrolling. Classic, Nocturne, and Cel-Shaded Mech have been removed. Saved selections of removed themes fall back to Big Button Sound Club.

## Theme development

Copy `src/themes/theme.template.ts` to a new `*.theme.ts` file only when adding an intentional new theme. The build discovers definitions automatically. `src/themes/contract.ts` validates their appearance tokens and supplies defaults. Use Big Button Sound Club and Pitch Press as the canonical examples; see [the theme contract](docs/themes.md) for details.

Theme preferences use `mouthpiece.pitchtracker.theme.v1`, separately from tracker records. Backups contain tracker data, not appearance preferences. The v1 tracker format is unchanged.

## Big Button Sound Club

Select **Big Button Sound Club** in the Theme picker for warm ivory molded surfaces, a dotted vintage speaker-grille backdrop, saturated blue displays, cherry-red playback, primary yellow selection and green controls inspired by vintage Fisher-Price cassette players and pull-along telephones. The recessed dots are CSS gradients, with clean reading surfaces above them. `src/themes/big-button.theme.ts` supplies existing contract tokens; `src/themes/big-button.css` adds paint-only toy decoration. Layout, copy, music artwork and behavior remain shared. System font stacks preserve offline operation without new assets.

## Lisa Lives!

**Lisa Lives!** uses rainbow sparkle navigation, light pink–cyan–yellow holographic cards, puffy outlined lettering, and white-edged microphone/speaker stickers. Dark plum live instruments contrast with the stationery surfaces. Active range buttons carry a repeating candy shimmer; reduced motion retains a static highlight. Inactive class-view instruments have matte muted lenses, plain uncolored meters, and no animation; recorded results remain static. Saturated leopard/zebra artwork and the leopard sticker remain bundled, with an original faint dolphin/rainbow SVG watermark layered into the wallpaper. Existing bundled Bangers lettering adds playful headings without changing shared geometry or offline operation.

## Vintage Audio

**Vintage Audio** uses matte charcoal-black stereo housing, dark physical controls, paired amber target/tuner instruments and translucent illuminated range buttons. Navigation uses muted oxide-red trim; an amber inset outline identifies the current student. Inactive target and tuner lenses have a flat, dimmer tint without a bulb hotspot. Selected live buttons briefly warm up, then stay lit; inactive last results retain a softer steady light and a subdued panel border. Reduced motion keeps the illumination without the entrance flutter. Fine CSS grain replaces the leather-like tolex texture; existing bundled condensed lettering is used for instrument labels and readings, with body lettering on action buttons. All decoration works offline and preserves shared geometry, with Full Screen Split View as the primary review surface.

Refinement direction: borrow the black plastic and milky backlit keys of vintage Alpine equipment while retaining the existing warm amber meter. Feedback fills the button face to be obvious to children, with limited surrounding glow and no continuous flicker. Review this first theme before refining the remaining themes.

## Boom Pow

**Boom Pow** turns the shared workspace into a pop-art comic: cyan Ben-Day print, yellow bursts, black ink outlines, ivory panels and red playback. Bangers provides comic lettering while body copy stays readable. Artwork and font are bundled offline; layout and live meter behavior stay shared.

## Pitch Press

**Pitch Press** pairs clean ivory paper with condensed ink lettering, fine editorial rules, and a dark concert-target block edged in vermilion. Cobalt identifies primary actions; yellow marks the current student and in-range feedback. The live tuner sits on a separate warm-paper surface. Subtle grain is limited to the page backdrop, keeping controls and student records crisp. Existing local Anton, Alfa Slab One, paper grain and masthead ink assets remain bundled offline. All session geometry stays shared, with Full Screen Split View as the primary experience.

## B Pop Tune Hunters

**B Pop Tune Hunters** translates the supplied supernatural pop poster into midnight-violet surfaces, silver-cyan condensed lettering, hot-pink playback, gold selection trim and fine curved sound-wave lines. A generated blue spirit-cat illustration decorates the active concert target; inactive class cards retain quiet reading surfaces. Cyan, gold and pink illuminate the entire low, correct and high feedback keys, with persistent recorded-result styling and visible keyboard focus. The theme has no continuous animation. Shared Full Screen Split View geometry, notation, settings and saved data remain unchanged.

The PNG is bundled directly through theme CSS, with existing local Anton lettering and system body fonts. No runtime network requests or new dependencies are needed. Artwork provenance and the generation prompt are recorded in [the asset record](docs/licenses/b-pop-spirit-stage.md).
