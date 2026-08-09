# Self-hosted fonts

Two variable fonts, latin subset only, served from this origin.

| File | Family | Axis | Size |
| --- | --- | --- | --- |
| `inter-latin-variable.woff2` | Inter | `wght 400–700` | 48 KB |
| `sora-latin-variable.woff2` | Sora | `wght 500–700` | 25 KB |

Declared in `nuxt.config.ts` under `fonts.families` with an explicit `src`, so
`@nuxt/fonts` never contacts a font provider at build time. That keeps builds
reproducible offline and means no third-party request is made from a visitor's
browser either.

Both are licensed under the SIL Open Font License 1.1 — see `OFL-Inter.txt` and
`OFL-Sora.txt`, which the licence requires be distributed alongside the fonts.

## Replacing or adding a font

Grab the latin subset URL from the Google Fonts CSS endpoint (the `/* latin */`
block), download the `.woff2` here, and add an entry to `fonts.families`. Give
it `fallbacks` so the module generates metric-override fallback faces — without
those, text reflows when the webfont swaps in and the Lighthouse CLS budget
(≤ 0.1, an error in CI) is at risk.

```bash
curl -A "Mozilla/5.0" "https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap"
```
