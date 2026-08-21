# Play Store listing assets

Uploaded by hand to Play Console. **Nothing here is part of the website** —
these files are not served, not referenced by any page, and never reach
`.output/`. That is the whole reason they live outside `public/`.

Both generators read from the site itself, so the store listing cannot quietly
drift from the product: the artwork uses `public/logo.png` and the site's own
webfonts, and the screenshots are captured from a real production build.

| File | Play field | Spec |
| --- | --- | --- |
| `icon-512.png` | App icon | 512×512, 32-bit PNG, ≤1 MB |
| `feature-graphic-1024x500.png` | Feature graphic | 1024×500 |
| `screenshots/phone-*/` | Phone screenshots | 1080×1920, at least 2 required |
| `screenshots/tablet-*/` | 7"/10" tablet screenshots | 1600×2560, optional |

## Regenerating

```bash
bun run play:assets        # icon + feature graphic
bun run build              # screenshots need a production build
bun run play:screenshots   # 24 shots: phone/tablet × light/dark
```

The icon and feature graphic are committed. The screenshots are not — they are
bulky, they change with every visual tweak, and the script rebuilds them in
about a minute. The script is the reproducible artefact, not its output.

## Two things that are easy to get wrong

**Screenshot aspect ratio.** Play rejects a screenshot whose long side is more
than twice its short side, so the tall 20:9 shape a modern phone actually has
is unusable. The captures are 16:9 for that reason, not because it matches any
particular device.

**Which browser binary.** Both scripts drive `headless_shell`, not
`chrome --headless`. Asked for a 1024×500 window the full browser lays out a
1024×413 viewport and pads the capture with white — you get an image of exactly
the right dimensions with a blank band across the bottom. `assets.mjs` fails
the build if that band appears, rather than trusting the binary stays correct.

Playwright would handle all of this, and is deliberately not a dependency —
see the note in `docs/roadmap.md`. These scripts drive the browser directly
instead.
