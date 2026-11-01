# knobdeck-themes

Dial themes for KnobDeck. The app ships only `knobdeck-dark` and `knobdeck-light`; everything here is downloaded from the Themes page.

- `themes/<id>/` — `theme.json`, `theme.css`, optional `assets/` and `presets/`.
- `previews/<id>.gif` — the preview shown in the app before download. Not a release asset: the registry links it by raw GitHub URL, so a new GIF shows up without a release.

Pushing to `master` runs the **release** workflow: it zips every theme, and publishes a GitHub Release with `<id>.zip` and a `registry.json` (id, name, author, version, zip, sha256, preview).

## Add or update a theme
1. Add `themes/<id>/` (lowercase `a-z0-9-` id), `previews/<id>.gif` and an `index.json` entry. To update, edit the theme and bump `"version"` in its `theme.json` **and** in `index.json` (see CLAUDE.md); unchanged versions are carried over from the previous release.
2. Push to master. Then run the **themes** workflow in the website repo; the site serves the new release and the app lists it (and offers an Update for changed versions).

Check locally: `node scripts/build-registry.mjs test` (needs `zip`), output in `out/`.
