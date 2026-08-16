# Static assets

Everything here is served from the site root as-is. `fonts/` has its own
README.

## Icons

All four are generated from `logo.png` (512×512, the master — keep it) and are
committed rather than built, so a deploy never depends on an image pipeline.

| File | Size | Purpose |
| --- | --- | --- |
| `logo.png` | 512×512 | Master artwork, and the header mark via `@nuxt/image` |
| `pwa-192x192.png` | 192×192 | Manifest icon, `purpose: any` |
| `pwa-512x512.png` | 512×512 | Manifest icon, `purpose: any` |
| `pwa-maskable-512x512.png` | 512×512 | Manifest icon, `purpose: maskable` |
| `apple-touch-icon.png` | 180×180 | iOS home screen — iOS ignores the manifest |
| `favicon.ico` | — | Browser tab, unrelated to the manifest |

Two of them are not just resizes, and both reasons matter:

- **The maskable icon is full-bleed and opaque.** Android crops it to whatever
  shape the launcher uses, so it must have no transparent corners — the
  squircle's corners are flattened onto `--accent-solid` (`#4f46e5`). It is
  *not* inset into the usual 80% safe zone: the `=` mark already spans only
  the middle ~60%, so it survives any crop, and insetting the squircle made
  its edge disappear against a background of the same hue.
- **The Apple touch icon is opaque too.** iOS composites transparency against
  black, which would put black corners around the squircle.

### Regenerating

`sharp` is already present as a transitive dependency of `@nuxt/image`, so
there is nothing to install. From the repo root:

```js
// gen-icons.mjs — throwaway, do not commit
import sharp from "sharp"

const SRC = "public/logo.png"
const BRAND = { r: 0x4f, g: 0x46, b: 0xe5, alpha: 1 } // --accent-solid

for (const size of [192, 512]) {
   await sharp(SRC).resize(size, size)
      .png({ compressionLevel: 9 }).toFile(`public/pwa-${size}x${size}.png`)
}

await sharp(SRC).resize(512, 512).flatten({ background: BRAND })
   .png({ compressionLevel: 9 }).toFile("public/pwa-maskable-512x512.png")

await sharp(SRC).resize(180, 180).flatten({ background: BRAND })
   .png({ compressionLevel: 9 }).toFile("public/apple-touch-icon.png")
```

```bash
bun gen-icons.mjs
```

If the brand colour moves, `BRAND` here and `--accent-solid` in
`app/assets/scss/base/_global.scss` have to move together.

## `ads.txt`

The AdSense publisher ID, without the `ca-` prefix — see the AdSense notes in
`nuxt.config.ts`. Unrelated to everything above.
