# Roadmap

What we could build next, and why. Two tracks: **more tools** and
**programmatic SEO**.

Traffic here is organic search, and revenue is one AdSense slot per page — so
value scales with *indexable pages × search intent covered*. The architecture
is already shaped for that: a tool is three edits (`app/utils/tools.ts`, a copy
block in `app/utils/copy.ts`, a page in `app/pages/`), and `convert()` in
`app/utils/units.ts` is a generic affine transform that already serves three
tools.

This is not `docs/plans/`. Those are per-feature plans written just before the
work; this is the list they get picked from.

**Scope of this pass:** generic/global tools, client-only. India-specific tools
and anything needing a server are deliberately later — see
[Out of scope](#out-of-scope).

---

## Tier 1 — new converters, no engine change

Each is one new `DIMENSIONS` entry, one registry entry, one copy block, and a
page that reuses `UnitConverter.vue`. All of these are purely multiplicative,
so `offset` stays 0 and `convert()` is untouched.

| Route | Units |
| --- | --- |
| `/speed-converter` | km/h, mph, m/s, ft/s, knot |
| `/volume-converter` | ml, l, m³, tsp, tbsp, fl oz, cup, pint, quart, gallon |
| `/area-converter` | mm², cm², m², km², hectare, in², ft², yd², acre, mi² |
| `/data-storage-converter` | bit, byte, KB/MB/GB/TB **and** KiB/MiB/GiB/TiB |
| `/time-converter` | ms, s, min, h, day, week, year |

Things that will be got wrong if they are not written down:

- **Volume — US and imperial are different sizes.** An imperial gallon is
  ~4.546 l, a US gallon ~3.785 l; pints and fluid ounces diverge too. Ship both
  as distinct unit ids (`gal-us`, `gal-imp`), or the tool is silently wrong for
  half the people who find it.
- **Data storage — decimal vs binary is the search intent.** People land on
  this page *because* their 1 TB drive shows 931 GB. Both families, labelled,
  or the page doesn't answer the question it ranks for.
- **Time — no "month".** A month has no fixed length. Year is 365 days,
  stated in the FAQ rather than assumed.
- **Fuel economy does not belong here.** mpg ⇄ L/100km is reciprocal, not
  affine — `base = value * factor + offset` cannot express it. It needs an
  engine change, so it is deferred rather than bolted on.

### Sequencing — three passes, not five, and not one

The table above makes these look interchangeable. The maths is; the work is
not. Ship them as:

1. **`/speed-converter` alone — the pilot.** Five units, every factor exact,
   no ambiguity to resolve. The cheapest example that still touches every
   surface: the `DimensionId` and `ToolKey` unions, four separate blocks in
   `copy.ts`, the registry, a page, `units.test.ts`, `verify.sh`, the README
   table. Whatever is implicit in "adding a tool" surfaces once, here, rather
   than five times.
2. **`/volume-converter` + `/area-converter` + `/time-converter` together.**
   The same move, once the pilot has proved it. What is left is copy, not
   code — the US/imperial ids and the 365-day year are decisions about
   wording and unit ids, made once and applied three times.
3. **`/data-storage-converter` alone.** Not a registry add. Sixteen units
   means a flat 16-option `<select>` rendered twice
   (`UnitConverter.vue:25-29`, `:62-66` — there is no `<optgroup>` support)
   and a 16-row always-visible table (`:98-111`), double today's largest.
   Decimal and binary need visual separation to be usable at all, so this is
   a component change wearing a converter's clothes.

Why not one batch of five: each tool needs three FAQ answers with real facts
in them, a title under 60 characters and a description under 155 — both
enforced by `test/unit/seo.test.ts` — plus a tagline, heading, lede and ~10
unit names. Five at once is ~50 unit labels and 15 factual answers written in
one sitting, which is where quality quietly goes, and it is the part a
reviewer cannot skim.

Why not five separate passes: volume, area and time are genuinely mechanical
once speed has landed. Five branches, plan docs, README edits and
semantic-release bumps for three repeats is ceremony without payoff.

**Decide during the pilot:** `scripts/seo/verify.sh` hardcodes its `ROUTES`
list and `README.md` hardcodes its tools table. Both have *already* drifted —
`/typing-speed-test` is missing from each. Four more routes will drift the
same way, so the pilot is the moment to derive both from `TOOLS` rather than
the fifth time someone forgets.

---

## Tier 2 — new panels, still no engine change

Ordered roughly by effort.

- **`/case-converter`** — upper, lower, title, sentence, camel, snake, kebab.
  Reuses `CopyButton.vue` and the `Intl.Segmenter` word-splitting already in
  `app/utils/text.ts`.
- **`/percentage-calculator`**, **`/age-calculator`** — pure arithmetic, no
  dependencies.
- **`/bmi-calculator`** — reuses `units.ts` for kg/lb and cm/ft-in, and the
  feet+inches composite input from `HeightConverter.vue`. Needs a new
  `ToolGroup` (`"health"`).
- **`/base64-encoder`**, **`/url-encoder`** — trivial, and they reinforce the
  privacy line rather than strain it.
- **`/uuid-generator`** — `crypto.randomUUID()`.
- **`/hash-generator`** — SHA-1/256/384/512 via `crypto.subtle.digest`.
  `app/utils/password.ts` already establishes how WebCrypto is used here.
- **`/json-formatter`** — format, minify, validate, with the error position.
- **`/lorem-ipsum-generator`** — mirrors the word-bank pattern in
  `app/utils/typing.ts`.
- **`/qr-code-generator`** — the only item needing a new dependency. Renders to
  canvas/SVG locally; nothing is uploaded.

**Suggested order:** speed → volume → area → case-converter → BMI.

The first three are registry-only adds. They prove the pattern at zero
conceptual cost before anything bespoke lands.

---

## Programmatic SEO

Each step depends on the one above it.

1. **Query-param deep links** — `?from=kg&to=lb&value=70` in
   `UnitConverter.vue`. Prerequisite for everything below, and useful on its
   own: it makes a conversion shareable. Use `router.replace`, not `push`, so
   typing a value doesn't fill the back stack.
2. **Category hub pages** — `/converters`, `/text-tools`, `/security-tools`.
   The cheapest new pages on this list: `toolsByGroup()` already exists in
   `app/utils/tools.ts` and is **currently called only by tests**. These pages
   give it a real caller and add a middle layer of internal linking between the
   hub and the tools.
3. **Pair routes** — `/weight-converter/kg-to-lb`, one dynamic page per
   dimension. Titles and descriptions generated, not hand-authored.
4. **Value routes** — `/weight-converter/70-kg-to-lb`. Highest volume of all,
   and the largest page count. Worth doing only once pair routes have proved
   themselves in Search Console.

### What steps 3 and 4 run into

- **Cap the cross-product.** Eight mass units is 56 ordered pairs; five
  dimensions unbounded is several hundred near-identical pages, which is a
  thin-content risk rather than a traffic win. Ship a curated `POPULAR_PAIRS`
  list per dimension.
- **`SEO` in `copy.ts` is a closed map** — `Record<PageKey, SeoCopy>`, one
  entry per page, which is exactly what makes a mistyped key a type error.
  Dynamic routes cannot key into it. They need a *generator function alongside*
  that record, not a loosening of it.
- **The SERP budget test only covers the static map.** `test/unit/seo.test.ts`
  enforces 60/155 characters over `SEO`; generated titles bypass it entirely
  and will ship clipped. Extend the test to sample generated strings.
  `truncate()` in `app/utils/seo.ts` is the helper for the cases that overflow.
- **`test/unit/tools.test.ts` is the registry-drift guard.** Hub pages and
  dynamic routes are pages but not tools. Extend that test deliberately;
  don't let new routes fail it and then relax the assertion.
- **The sitemap needs generated routes fed in explicitly.** Doing that via a
  `server/api/__sitemap__/urls` source would introduce this repo's first
  `server/` directory. That is build-time SEO plumbing and handles no user
  data, so it does not break the client-only promise — but it should be an
  explicit decision, not a quiet one. Static `sitemap.urls` config in
  `nuxt.config.ts` avoids the question entirely.
- **`scripts/seo/verify.sh` hardcodes its `ROUTES` list.** Every new route has
  to be added there, or its SEO surface is never asserted.

---

## Out of scope

Recorded so the reasons survive.

- **Currency converter.** Needs live exchange rates, which needs a server and a
  cache. Everything else on this list runs in the browser and sends nothing;
  this one would be the first exception, and it would need the privacy policy
  amended. Revisit deliberately.
- **India-specific tools** — GST calculator, EMI/loan calculator, land-area
  units (gaj, cent, guntha, bigha, ground). High intent, but a second pass
  after the generic set is in.
- **Platform UX** — Ctrl+K tool search, favourites, PWA/offline. Worth doing;
  not this roadmap. Worth noting that `ToolNav.vue`'s horizontal scroll stops
  scaling somewhere past a dozen tools, so search becomes necessary rather than
  nice if Tier 1 and Tier 2 both land.
- **Test and CI infrastructure** — Playwright E2E, an axe-core runner in the
  repo, `seo:verify` and Lighthouse wired into CI.
