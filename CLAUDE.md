# KnobDeck themes — working rules

Dial themes served to the KnobDeck app through GitHub Releases and the website (see README.md).

## Rule 1: a change to a theme bumps its version

Any change to `themes/<id>/` needs a new `version` in `themes/<id>/theme.json`
(semver; absent means `1.0.0`). The app compares versions to offer an Update, so an unbumped change never reaches users.
Preview GIFs are the exception: the registry links `previews/<id>.gif` by raw GitHub URL, so a new GIF is live as soon as it is on master.

## Rule 2: update `index.json` with the new version

Put the same version in `index.json`. CI fails if `index.json` and `theme.json` disagree. The release workflow
rebuilds a theme only when its `index.json` version differs from the previous release's `registry.json`; any other
theme's zip is copied over from that release unchanged. So without the bump, your change is not published.

New theme: add `themes/<id>/`, `previews/<id>.gif` and an `index.json` entry. After the release, run the website
repo's **themes** workflow so the site (and the app) see it.
