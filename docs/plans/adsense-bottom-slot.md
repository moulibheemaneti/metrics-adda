# Google AdSense — one bottom-of-page slot

## Context

Metrics Adda currently ships zero ads. The goal is to monetise with **Google
AdSense** (the publisher product; "Google Ads" is the advertiser side and is
not what runs on a site) via a **single manual ad unit rendered above the
footer on every page**.

The two things that constrain the design:

1. **`lighthouserc.json` fails the build on `cumulative-layout-shift > 0.1`
   (severity `error`).** Perf/TBT/best-practices are only `warn`. So the one
   thing an ad can actually break in CI is layout shift — every decision below
   is driven by reserving the slot's height up front.
2. **AdSense will not approve a site with no privacy policy**, and the site's
   own copy currently promises "no ads", which becomes false on launch.

Chosen approach (confirmed): manual fixed slot, all pages, above the footer,
plus the `/privacy` page, the copy fix, and the EU consent message.

---

## Does this hurt SEO?

Short answer: **not by itself.** Ads are not a ranking signal and Google does
not penalise AdSense. What can hurt is *how* they're implemented — and the
chosen layout avoids each of those:

| Risk | Applies here? |
|---|---|
| **CLS regression** (Core Web Vitals is a ranking signal) | Real risk — mitigated by a fixed reserved container. This is the whole design constraint. |
| **Intrusive interstitial penalty** (sticky/overlay/anchor units) | Avoided — we rejected the anchor unit. An in-flow slot above the footer cannot trigger it. |
| **"Page layout algorithm"** (too much ad above the fold) | Avoided — bottom placement is the safest position on the page. |
| **LCP / INP from third-party JS** | `adsbygoogle.js` is `async` and the unit is below the fold, so it won't become LCP. Expect a Lighthouse perf drop of roughly 5–15 points and added TBT — both are `warn`-level in CI, not build-breaking. |
| **Thin content + high ad density** ("helpful content") | Low risk at one unit per page, but these are 5 small tool pages. Do not add a second unit later without adding content. |
| **Crawling / indexing** | Ad iframes are not indexed as your content and don't dilute the page. `nuxt-robots` already serves `User-agent: *` allow, so `Mediapartners-Google` (the AdSense crawler) gets in. |

Net: expect **no ranking change** from the ads themselves, and a measurable
but non-fatal Lighthouse performance dip. Verify with the existing
`scripts/seo/lighthouse.sh` before and after.

---

## Implementation

### 1. Config — publisher ID via runtime env

`nuxt.config.ts` has **no `runtimeConfig` block today**. Add one:

```ts
runtimeConfig: {
   public: {
      // Empty = ads off. Local dev, preview builds and CI render nothing,
      // so Lighthouse measures the site rather than Google's auction.
      adsenseClient: "",   // NUXT_PUBLIC_ADSENSE_CLIENT, e.g. "ca-pub-1234567890123456"
      adsenseSlotFooter: "", // NUXT_PUBLIC_ADSENSE_SLOT_FOOTER, e.g. "1234567890"
   },
},
```

Runtime (not build-time `process.env`) so the publisher ID can be rotated
without a rebuild. Add both keys to `.env.example` next to `NUXT_SITE_URL`,
and set them in the Vercel project's env vars.

### 2. `app/components/AdSlot.vue` — new

Single owner of the whole AdSense concern.

- Reads `useRuntimeConfig().public`; **renders nothing at all** when
  `adsenseClient` is empty (`v-if`), so dev/CI are untouched.
- Loads the script itself via `useHead` — `src` =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<id>`,
  `async: true`, `crossorigin: "anonymous"`, `tagPriority: "low"`. Putting it
  here rather than in `app.head` keeps it off pages that render no slot and
  keeps the ID in one place. (The existing theme-flash script in
  `nuxt.config.ts` `app.head.script` stays as-is — it is `critical` for a
  reason and is unrelated.)
- Markup: a labelled wrapper + the standard unit.
  ```html
  <aside class="ad-slot" aria-label="Advertisement">
     <span class="ad-slot__label">Advertisement</span>
     <ins class="adsbygoogle" :data-ad-client :data-ad-slot
          data-ad-format="horizontal" data-full-width-responsive="false" />
  </aside>
  ```
  The visible "Advertisement" label is a Google publisher-policy requirement
  (ads must be distinguishable from content) and also stops the unit reading
  as site content to a crawler. `<aside>` keeps it out of the `<main>` content
  outline.
- `onMounted` (client only): `(window.adsbygoogle = window.adsbygoogle || []).push({})`,
  wrapped in `try/catch` — the same defensive shape as the theme script, since
  ad blockers make `window.adsbygoogle` throw.
- **Reserved height is the load-bearing part.** Fixed `block-size` (not
  `min-block-size`) with `overflow: hidden`, using `px-to-rem()` from
  `assets/scss/abstracts/_functions.scss`:
  - phone: `100px`
  - `@media (width >= 48rem)`: `280px`

  Fixed height + `data-full-width-responsive="false"` means the box never
  changes size whether the ad fills, fails, or is blocked — zero CLS. The
  cost is a blank labelled box on unfilled impressions; that is the correct
  trade against an `error`-level CLS gate.
- Styling: `<style scoped lang="scss">` with `@use "../assets/scss/abstracts" as *;`,
  matching every other component. Centre it and cap it at `--page-max` with
  `margin-inline: auto` + `padding-inline: var(--page-gutter)`, mirroring
  `.page` in `assets/scss/layout/_page.scss`.

### 3. `app/layouts/default.vue` — one line

Insert between `<slot />` and `<SiteFooter />`:

```html
<AdSlot />
```

That position is exactly the "end of page content" seam — the layout's
`:deep(main) { flex: 1 }` already pushes it and the footer to the bottom on
short pages. Auto-imported, no script changes.

### 4. `public/ads.txt` — new, required

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Static file in `public/` (alongside `favicon.ico`). Without it AdSense flags
the site as unauthorised inventory and demand drops. Note: this file has to
carry the literal publisher ID — it cannot come from runtime config.

### 5. `/privacy` page — new, AdSense prerequisite

- `app/pages/privacy.vue` — plain prose page using the existing `.page
  .stack` classes directly (**not** `ToolShell`, which injects a FAQ and an
  "Other tools" grid). Must include its own `<main>` element for the layout's
  `flex: 1` rule.
- Content must cover, per Google's publisher requirements: third-party
  vendors including Google use cookies to serve ads; Google's use of
  advertising cookies; opt-out via `google.com/settings/ads`; the tools
  themselves process nothing server-side; Vercel Analytics/Speed Insights;
  contact at `SITE_EMAIL` from `app/utils/site.ts` (whose comment already
  refers to "the policy" — this closes that loop).
- `app/utils/copy.ts`: widen `PageKey` to `ToolKey | "home" | "privacy"` and
  add a `SEO.privacy` entry. `test/unit/seo.test.ts` iterates `SEO`, so the
  title must be ≤ 60 and description ≤ 155 chars or the suite fails.
- Wire SEO in the page with `useAppSeo(SEO.privacy)` +
  `defineOgImage("Tool", { … })`. Do **not** use `useToolPage` (it emits
  FAQPage + SoftwareApplication schema that don't apply).
- **Do not add it to `TOOLS`** in `app/utils/tools.ts` — that registry drives
  the header nav and the "Other tools" grid, and
  `test/unit/tools.test.ts` requires every entry to have a `COPY.tools` block.
  A policy page is not a tool.
- `@nuxtjs/sitemap` discovers the route automatically; no sitemap config needed.
- `app/components/SiteFooter.vue`: add a `<NuxtLink to="/privacy">` beside the
  existing contact link, with the label in `COPY.footer` (e.g. `privacy: "Privacy"`).
- `scripts/seo/verify.sh` line 26: append `/privacy` to `ROUTES`.

### 6. Copy fixes — "no ads" becomes false

- `app/utils/copy.ts:72` — `SEO.home.description` ends `"No sign-up, no ads."`.
  Replace the tail, e.g. `"… password generator. Free and no sign-up."`
  Keep it ≤ 155 chars (`test/unit/seo.test.ts` enforces this).
- `README.md:3` — `"— no sign-up, no ads."` → drop `, no ads`.
- `COPY.home.eyebrow` ("Five tools, no sign-up") stays — still true.

### 7. Console-side steps (no code) — for you, not the implementation

1. Submit the site in AdSense and pass review (needs `/privacy` live first).
2. Create one display unit named e.g. `footer-horizontal`; put its slot ID in
   `NUXT_PUBLIC_ADSENSE_SLOT_FOOTER`.
3. **Privacy & messaging → GDPR message**: publish the EU/UK consent message.
   Required to serve personalised ads in the EEA/UK; it is an AdSense-hosted
   CMP, so there is nothing to build.
4. Consider also publishing the CCPA/US-states message while you're there.

---

## Files touched

| File | Change |
|---|---|
| `nuxt.config.ts` | new `runtimeConfig.public` block |
| `app/components/AdSlot.vue` | **new** — script loading, unit, reserved height |
| `app/layouts/default.vue` | `<AdSlot />` between `<slot />` and `<SiteFooter />` |
| `app/components/SiteFooter.vue` | privacy link |
| `app/pages/privacy.vue` | **new** |
| `app/utils/copy.ts` | `PageKey` + `SEO.privacy` + `COPY.footer.privacy` + home description |
| `public/ads.txt` | **new** |
| `.env.example` | two new keys |
| `scripts/seo/verify.sh` | `/privacy` in `ROUTES` |
| `README.md` | drop "no ads" |

---

## Verification

1. `bun run test` — `seo.test.ts` (new `SEO.privacy` within budget, home
   description still ≤ 155) and `tools.test.ts` (registry untouched) must pass.
2. `bun run lint` and `bun run lint:style`.
3. `bun run dev` with **no** AdSense env vars → confirm via the browser preview
   that no ad markup, no `pagead2` network request, and no console errors
   appear. This is the state CI and Lighthouse run in.
4. Set the two vars in `.env`, restart, and confirm: the reserved box renders at
   the right height on desktop and phone (`resize_window` to mobile), the
   script loads once, `/privacy` renders and is linked from the footer.
5. **CLS proof** — `scripts/seo/lighthouse.sh` before and after, comparing
   `cumulative-layout-shift` (must stay < 0.1, hard gate) and noting the
   performance delta. Run it with ads **enabled** locally, which CI won't do.
6. `BUILD=1 scripts/seo/verify.sh` — all routes green including the new
   `/privacy` (title, description, canonical, OG image, JSON-LD, sitemap entry).
7. `curl` the deployed `/ads.txt` and `/robots.txt` after deploy.
