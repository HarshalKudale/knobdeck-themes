# knobdeck-themes

Dial themes for KnobDeck. The app ships only `knobdeck-dark` and `knobdeck-light`; everything here is downloaded from the Themes page.

- `themes/<id>/` — `theme.json`, `theme.css`, optional `assets/` and `presets/`.
- `previews/<id>.gif` — the preview shown in the app before download.

Pushing to `master` runs the **release** workflow: it zips every theme, and publishes a GitHub Release with `<id>.zip`, `<id>.gif` and a `registry.json` (id, name, author, version, zip, sha256, preview).

## Add or update a theme
1. Add `themes/<id>/` (lowercase `a-z0-9-` id) and `previews/<id>.gif`. To update, edit the theme and bump `"version"` in its `theme.json` (default `1.0.0`).
2. Push to master. Then run the **themes** workflow in the website repo; the site serves the new release and the app lists it (and offers an Update for changed versions).

Check locally: `node scripts/build-registry.mjs test` (needs `zip`), output in `out/`.
