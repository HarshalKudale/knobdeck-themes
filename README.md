# knobdeck-themes

Dial themes for KnobDeck, all original. The app ships three built-ins (**Auto**, **Midnight** and
**Daylight**, in `Knobdeck/app/public/dial-themes/`); everything here is downloaded from the Themes page.

| Theme | Look | Presets |
|---|---|---|
| `analog` | Hardware synth knob: knurled metal, tick marks, an LED arc that follows the pointer | Red, Green, Blue, White |
| `graphite` | Machined aluminium: spun-metal center, brushed buttons, engraved icons | Space Gray, Gold, Navy |
| `frost` | Frosted glass discs with a sheen | Smoke, Ice, Rose |
| `ember` | Amber on black with a segmented meter | Nixie, Ice, Lime |
| `phosphor` | Green-screen terminal: square tiles, scanlines, monospace | Amber, White, Cyan |
| `neon-grid` | Synthwave sunset over a neon grid | Miami, Laser, Toxic |
| `paper` | Ink on paper, hand-drawn outlines, highlighter hover | Blueprint, Kraft, Chalk |
| `bloom` | Pastel petals coloured by their direction | Vivid, Mint, Dusk |
| `mono-line` | Thin outlines only | Ink (light wallpapers), Gold |
| `aurora` | Dark glass with a turning aurora glow | Solar, Ocean, Rose |
| `studio` | Creator console with an on-air light | Violet, Teal, Gold |
| `contrast` | Accessibility: bold outlines, large targets, almost no motion | Black on White, White on Blue |

- `themes/<id>/`: `theme.json`, `theme.css`, optional `presets/<Name>.json` and `assets/`.
- `previews/<id>.gif`: the preview shown in the app before download. It isn't a release asset: the
  registry links it by raw GitHub URL, so a new GIF shows up without a release.

Pushing to `master` runs the **release** workflow: it zips every theme and publishes a GitHub Release
with `<id>.zip` and a `registry.json` (id, name, author, version, zipUrl, sha256, preview). Then run
the **registries** workflow in `knobdeck-registry` so the app sees it.

## Writing a theme

The dial engine is `Knobdeck/app/src/dial/overlay/` (Kando's theme format, engine version 1).

**theme.json**

| Field | |
|---|---|
| `name`, `author`, `license`, `version`, `description` | Shown in the app. `version` is semver (see CLAUDE.md). |
| `layers` | One div per layer inside every node, **first = frontmost**. `content`: `"icon"`, `"name"` or `"none"`. |
| `colors` | Set as `--<name>` custom properties; the CSS reads them. A preset overrides any of them. |
| `presets` | Names of `presets/<Name>.json` files (`{"colors": {...}}`). The app offers them as chips. |
| `centerTextWrapWidth` | Diameter the hovered item's name wraps into. |
| `drawChildrenBelow`, `drawCenterText`, `drawSelectionWedges`, `drawWedgeSeparators` | Engine switches. |
| `sliderStyle` | `"track"` (every theme here): a slider opens as a dial scale. Each value stop is a tick: every step of the slider, or every 2nd / 5th / 10th… when that is more than 61, spread over 300°. See the slider hooks below. `"steps"` (default when absent): 16 value items on the ring. |
| `dynamicCenter` | Optional `{ childDistance, itemSpacing, childSize, gap, growth, minSize, maxSize, textRatio }` in px, mirroring the theme CSS. When set, a dynamic ring's center starts at `minSize` and grows `growth` px for each px the ring widens past `childDistance` (staying `gap` clear of the items, up to `maxSize`), the engine sets `--dynamic-center-size` on it, and the hovered item's text wraps into `size × textRatio`. |
| `previewBackground` | CSS background for the preview tool only; the app ignores it. |

**What the CSS can use**

- Node classes: `active` (the center), `child` (its ring), `parent` (the menu you came from),
  `grandchild` (items of a closed submenu: the engine hides them, so don't draw them as dots),
  `hovered`, `clicked`, `dragged`, `level-<n>`, `type-<root|submenu|button|…>`,
  `left/right/top/bottom`, `dynamic-menu` (a plugin-filled ring). The layer holding the icon also
  gets `kd-icon-layer`.
- Sliders: `slider-menu` (the slider; `kd-scale` too on a `"track"` theme), `slider-previewing`
  (while a value is hovered), and on its stops `slider-step`, `current` (nearest the live value),
  `filled` (up to the hovered or live value), `major` with `data-tick="<number>"` (a round value
  the scale should number). On a `"track"` theme the slider node also holds a `.kd-scale-plate`
  div (behind everything) for the theme to size and paint.
- Set on an open slider's node: `--slider-start-angle`, `--slider-end-angle`, `--slider-span`,
  `--slider-fill` (from the start to the hovered or current value; registered as an inherited
  `<angle>`, so it animates and a layer's `::before` can use it), `--slider-value` (the live
  value as a CSS string, for `content`) and `--slider-readout` (the hovered value, else the live
  one; the engine prints no center text for a scale's stops).
- The themes here share one "Sliders: a dial scale" block at the end of `theme.css`: ticks are the
  stops' `::before`, numbers their `::after`, the pointer and the readout the slider's `::after` /
  `::before`. A theme only sets the `--scale-*` sizes and colours above it and paints the plate.
  `filled`, `major`, the plate and `--slider-readout` need an app newer than 0.3.2; older ones show plain ticks.
- Set on an open dynamic ring's node (with `dynamicCenter`): `--dynamic-center-size`.
- Set on each node: `--dir-x`, `--dir-y` (unit direction), `--angle` (0deg = up, clockwise),
  `--sibling-count`, `--start-angle` / `--end-angle` (its wedge), `--parent-angle`.
- Set on layer divs of the center (animatable): `--pointer-angle`, `--hover-angle`,
  `--hovered-child-angle`. They're registered as non-inherited, so use them on the layer itself, not
  on a `::before`.
- Also styled: `.connector`, `.center-text`, `.selection-wedges`, `.wedge-separators .separator`.
- The dial window is transparent and `backdrop-filter` can't see the desktop behind it, so glass
  looks need enough tint to read on a busy wallpaper. Respect `prefers-reduced-motion`.

**Checklist before shipping a theme**

Run `node scripts/preview/preview.mjs check <id>` and `presets <id>` and look at `out/check/`:
idle and hovered, an open submenu, 4 / 8 / 12 items, long labels, an open slider (at rest, with
a value hovered, and a coarse 0–10 one), every preset (menu and slider). Then make the GIF
with `node scripts/preview/preview.mjs gif <id>`. `serve <id>` gives a page to try it with the mouse.
The tool needs this workspace layout (`../Knobdeck` with `npm install` done in `app/`,
`../knobdeck-launch-video` for Playwright), ffmpeg, and a Chromium-based browser (`BROWSER=...`).

Check the registry build locally: `node scripts/build-registry.mjs test` (needs `zip`), output in `out/`.

## License

The themes are CC0-1.0 (see `LICENSE`).
