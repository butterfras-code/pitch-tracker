# Pitch Tracker themes

Run `npm run build`, then open `dist/index.html` directly in your browser. Select a theme in the header. Cel-Shaded Mech is the default; Classic Studio is also included. Everything works offline without external fonts or libraries. `Pitch-Tracker.html` is the preserved upstream baseline.

## Add a theme

Inside `src/ui/themes.ts`, find `THEME_REGISTRY`. Add an entry, then rebuild:

```js
{
  id: 'ocean',
  name: 'Ocean Studio',
  tokens: {
    bg: '#eef7fb',
    accent: '#075985',
    soft: '#dbeef8',
    'primary-hover': '#0c4a6e'
  }
},
```

The selector lists entries automatically. Omitted tokens inherit the Classic values in the two `:root` CSS blocks in `src/styles.css`. Use the Mech entry as a complete dark-theme example. Include `treatment: 'mech'` to reuse its angular controls, panel outlines, and heading treatment; omit it for the standard structure. For new structural styling, choose a new treatment name and scope CSS to `:root[data-treatment="your-treatment"]`.

Tokens cover page/card/control surfaces, text, borders, primary controls, scoring states, focus rings, notices, typography, radii, shadows, and background patterns. Keep status text readable on its corresponding background and test keyboard focus, forms, dialogs, history, mobile widths, and print output.

Change `DEFAULT_THEME` to a registered ID to change the initial theme. A previously saved choice takes precedence. Removed or unrecognized theme IDs fall back to the default.

Preferences use `mouthpiece.pitchtracker.theme.v1` in localStorage, separately from tracker records. JSON backups do not include the theme. If storage is unavailable, switching still works for the current visit. Theme changes do not rebuild the interface or interrupt a pitch check.

Before replacing or moving your existing tracker, download a data backup from the old file; browser storage may differ by file location. Restore that backup in the updated tracker if needed.
