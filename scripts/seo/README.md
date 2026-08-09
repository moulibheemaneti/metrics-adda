# SEO verification scripts

Local checks for the Nuxt SEO setup. Both scripts build the production output
(if missing), boot the SSR server, run their checks, and tear the server down.

## `verify.sh` — SEO smoke test

Asserts every SEO surface renders, with a pass/fail summary:

- `robots.txt` is dynamic, indexable, and references the sitemap
- `sitemap_index.xml` lists every locale sitemap
- for each route in `$ROUTES` (default `/`): `<title>`, meta description,
  canonical, `og:*`, `twitter:*`, in-head hreflang with absolute URLs,
  Schema.org JSON-LD, presence in the sitemap, and a rendered OG PNG

```bash
scripts/seo/verify.sh                 # build if needed, boot, check
BUILD=1 scripts/seo/verify.sh         # force a fresh build first
PORT=4000 scripts/seo/verify.sh       # different local port
ROUTES="/ /pricing" scripts/seo/verify.sh                     # check more routes
BASE_URL=https://<preview>.vercel.app scripts/seo/verify.sh   # check a remote deploy
```

Exit code = number of failed checks (`0` = all green). Also runnable as
`bun run seo:verify`.

When a locale is added to `nuxt.config.ts`, add its BCP-47 tag to the
`LOCALES` array at the top of `verify.sh` so its sitemap is asserted too.

## `lighthouse.sh` — Lighthouse CI (SSR-aware)

The `lighthouserc*.json` files hold only assertions, so `lhci autorun` on its
own can't locate a static dir for this SSR app. This script points Lighthouse
at the running server instead.

```bash
scripts/seo/lighthouse.sh                         # desktop config, "/"
scripts/seo/lighthouse.sh lighthouserc.mobile.json
URLS="/ /pricing" scripts/seo/lighthouse.sh       # audit multiple routes
```

Also runnable as `bun run seo:lighthouse`.

## Notes

- Requires `curl` and `bun`. `lighthouse.sh` also needs Chrome installed.
- For live social-card previews (WhatsApp/X/LinkedIn), a public URL is still
  required — deploy a Vercel preview and pass it via `BASE_URL=`.
