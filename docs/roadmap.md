# Roadmap

What we could build next, and why. Two tracks: **more tools** and
**programmatic SEO**.

Traffic here is organic search, and revenue is one AdSense slot per page — so
value scales with *indexable pages × search intent covered*. The architecture
is shaped for that: a tool is three edits (`app/utils/tools.ts`, a copy block
in `app/utils/copy.ts`, a page in `app/pages/`), and `convert()` in
`app/utils/units.ts` is a generic affine transform now serving eight
dimensions.

This is not `docs/plans/`. Those are per-feature plans written just before the
work; this is the list they get picked from.

**Scope:** generic/global tools, client-only. India-specific tools and
anything needing a server are deliberately later — see
[Out of scope](#out-of-scope).

**Where things stand:** 15 tools. Tier 1 is done; Tier 2 is about half done.

---

## Tier 1 — converters ✅ shipped

Five converters, three passes, no change to `convert()`. All purely
multiplicative, so `offset` stayed 0 throughout.

| Route | Units | Pass |
| --- | --- | --- |
| `/speed-converter` | m/s, km/h, mph, ft/s, knot | 1 — pilot |
| `/volume-converter` | ml, l, m³, 7 US units, 3 imperial | 2 |
| `/area-converter` | mm², cm², m², ha, km², in², ft², yd², acre, mi² | 2 |
| `/time-converter` | ms, s, min, h, day, week, year | 2 |
| `/data-storage-converter` | bit, byte, kB–PB, KiB–PiB | 3 |

### What the traps turned out to be

Written down before the work, and worth keeping — the next dimension will hit
the same shapes.

- **Volume needed 13 units, not the 10 first listed here.** Both measurement
  systems is non-negotiable (an imperial gallon is 4.54609 l, a US gallon
  3.785411784 l), and that pushes the count up. Every US unit derives from the
  US gallon's exact 231 in³, every imperial one from the exact 4.54609 l.
- **Qualifier goes first in a unit name.** `UnitConverter` renders a unit as
  `name (symbol)`, so `"Pint (US)"` came out as `"Pint (US) (pt)"`. The mass
  block already had the answer: `"US ton"`. Use `"US pint"`.
- **Hyphenated unit ids force quoted object keys.** `"us-gal"` must be quoted,
  and `@stylistic/quote-props` is `consistent`, so *every* key in that copy
  block needs quoting — including `ml` and `l`. Lint catches it.
- **Data storage was a component change, not a registry add.** Twelve units
  where "Kilobyte" and "Kibibyte" differ by one letter. Units can now declare a
  `group`, and `unitGroups()` returns `null` for the seven dimensions that
  don't — so grouping is available to any future dimension at no cost.
- **Grouping is all-or-nothing per dimension.** A half-grouped dimension puts
  its ungrouped units in an empty-labelled `<optgroup>`, which most browsers
  silently drop — units vanish with no error. `test/unit/units.test.ts` holds
  that line.
- **Time has no "month".** No fixed length, so any factor is a guess printed to
  eight significant digits. Year is 365 days, stated in the FAQ.
- **Fuel economy still does not belong here.** mpg ⇄ L/100km is reciprocal, not
  affine — `base = value * factor + offset` cannot express it. Deferred, not
  forgotten.

### What the three-pass split was worth

Kept because the same question will come up for Tier 2.

- **The pilot earned its keep.** Speed alone surfaced the `DimensionId` /
  `ToolKey` union shape, the four separate copy blocks, and the `verify.sh`
  drift — once, on five units, instead of five times.
- **Deriving beat hand-editing.** `scripts/seo/verify.sh` now reads its routes
  from `TOOLS` via `bun -e`. The four later routes were asserted the moment
  they were registered, with no edit to the script. It also fixed a real gap:
  `/typing-speed-test` had shipped without its SEO surface ever being checked.
- **The registry-drift guards auto-extended.** `test/unit/tools.test.ts`
  iterates `TOOLS` and `DIMENSIONS`, so it picked up every new dimension and
  checked its copy and unit labels without being touched.
- **Copy is the part that scales badly, not code.** Each tool is ~10 unit
  labels, 3 FAQ answers with real facts in them, and a title/description inside
  the 60/155 budgets `test/unit/seo.test.ts` enforces. That is why five in one
  sitting was the wrong shape.

---

## Tier 2 — new panels, no engine change

### Shipped

| Route | Notes |
| --- | --- |
| `/case-converter` | Ten cases, split into text and identifier families |
| `/bmi-calculator` | Plus the advanced body-composition mode; added `"health"` |
| `/lorem-ipsum-generator` | Seeded generation, so it server-renders |
| `/uuid-generator` | v4, with a `getRandomValues` fallback |

The last two added a `"generators"` group. `password-generator` was left in
`"security"` rather than moved into it — it is arguably a generator too, but
moving a shipped tool changes a nav label people may already recognise, and
that wants to be its own decision rather than a side effect of this one.

### Still to build

- **`/percentage-calculator`**, **`/age-calculator`** — pure arithmetic, no
  dependencies. Neither fits an existing group; they want a `"calculators"` one.
- **`/base64-encoder`**, **`/url-encoder`** — trivial, and they reinforce the
  privacy line rather than strain it.
- **`/hash-generator`** — SHA-1/256/384/512 via `crypto.subtle.digest`.
  `app/utils/password.ts` already establishes how WebCrypto is used here.
- **`/json-formatter`** — format, minify, validate, with the error position.
- **`/qr-code-generator`** — **deferred on the dependency.** It is the only
  item on this list needing one, and the call is to stay dependency-free for
  now. `uqr` (unjs, zero-dep, MIT, SVG output) is the candidate when that is
  revisited; the alternatives are heavier and drag in Node-only code.

**Suggested order:** percentage → age → the encoders.

### What the four shipped ones turned out to teach

- **SSR is the fork in the road for a generator.** Two of these generate
  content, and they resolve it opposite ways on purpose. Lorem ipsum is seeded
  from a fixed integer, so the server and the client produce identical text,
  hydration is silent, and a crawler gets real placeholder copy. UUIDs are
  generated client-only in `onMounted`, because a value baked into cached HTML
  would be handed to every visitor — the same rule `PasswordGeneratorPanel.vue`
  already followed. The deciding question is whether a repeated value is merely
  dull or actually a bug.
- **Reformatting is not regeneration.** Ticking "uppercase" on the UUID panel
  restyles the values already on screen instead of drawing new ones. The
  obvious `watch(options, regenerate)` — which is right for the password
  panel — would swap the list under someone who had just pasted the first one
  somewhere.
- **One definition of "word", in one module.** The lorem panel counts its
  output with `analyseText` from `utils/text.ts` rather than a local split, so
  the number agrees with the word counter's.
- **Clamp on `NaN`, not on `!isFinite`.** An emptied number input yields `NaN`,
  which passes through `Math.min`/`Math.max` untouched and needs the guard. The
  infinities do not — they are genuinely out of range and clamp correctly on
  their own, so lumping them in with `NaN` sends a too-large request to the
  *minimum*, which is the opposite of what was asked for.

---

## Programmatic SEO

**Parked until there is real traffic to reason about.** Nothing here has
started, and the order below is kept because the dependencies between the
steps still hold — but step 1 was previously described as an SEO win, and it
is not one. Query parameters do not earn indexable pages: `site.url` in
`nuxt.config.ts` drives a path-only canonical, so `?from=kg&to=lb` would emit
`<link rel="canonical">` pointing back at the bare route, telling Google to
ignore it. The server HTML is identical for every parameter combination, and
none of those URLs are in the sitemap or linked internally. Its real value is
shareability plus the state-hydration refactor that steps 3 and 4 would reuse
— worth doing for those reasons, not for search.

The page-count play is steps 3 and 4, because a path is a real page: its own
prerendered HTML, its own title and H1, its own sitemap entry. Step 2 is the
cheapest genuine win and does not depend on step 1 at all.

Each step depends on the one above it.

1. **Query-param deep links** — `?from=kg&to=lb&value=70` in
   `UnitConverter.vue`. Prerequisite for everything below, and useful on its
   own: it makes a conversion shareable. Use `router.replace`, not `push`, so
   typing a value doesn't fill the back stack.
2. **Category hub pages** — `/converters`, `/text-tools`, `/security-tools`.
   The cheapest new pages on this list: `toolsByGroup()` already exists in
   `app/utils/tools.ts` and is **still called only by tests**. These pages give
   it a real caller and add a middle layer of internal linking between the hub
   and the tools — which matters more now that `/converters` alone would hold
   eight.
3. **Pair routes** — `/weight-converter/kg-to-lb`, one dynamic page per
   dimension. Titles and descriptions generated, not hand-authored.
4. **Value routes** — `/weight-converter/70-kg-to-lb`. Highest volume of all,
   and the largest page count. Worth doing only once pair routes have proved
   themselves in Search Console.

### What steps 3 and 4 run into

- **Cap the cross-product — and Tier 1 made this sharper.** The eight
  dimensions now hold 558 ordered unit pairs between them (volume alone is 156,
  data storage 132). Generating all of them is several hundred near-identical
  pages and a thin-content risk, not a traffic win. Ship a curated
  `POPULAR_PAIRS` list per dimension.
- **Grouped dimensions need a pair-route policy.** `kb-to-kib` is a real search;
  `bit-to-pib` is not. Data storage's cross-product is mostly noise, so it wants
  a tighter curation than the others rather than the same rule.
- **`SEO` in `copy.ts` is a closed map** — `Record<PageKey, SeoCopy>`, one entry
  per page, which is exactly what makes a mistyped key a type error. Dynamic
  routes cannot key into it. They need a *generator function alongside* that
  record, not a loosening of it.
- **The SERP budget test only covers the static map.** `test/unit/seo.test.ts`
  enforces 60/155 characters over `SEO`; generated titles bypass it entirely and
  will ship clipped. Extend the test to sample generated strings. `truncate()`
  in `app/utils/seo.ts` is the helper for the cases that overflow.
- **`test/unit/tools.test.ts` is the registry-drift guard.** Hub pages and
  dynamic routes are pages but not tools. Extend that test deliberately; don't
  let new routes fail it and then relax the assertion.
- **The sitemap needs generated routes fed in explicitly.** Doing that via a
  `server/api/__sitemap__/urls` source would introduce this repo's first
  `server/` directory. That is build-time SEO plumbing and handles no user data,
  so it does not break the client-only promise — but it should be an explicit
  decision, not a quiet one. Static `sitemap.urls` config in `nuxt.config.ts`
  avoids the question entirely.
- **`scripts/seo/verify.sh` covers tool routes automatically now**, but dynamic
  routes are not in `TOOLS`. Pair and value routes will need their own sampling
  strategy — asserting all of them is neither fast nor useful.

---

## Known rough edges

Found while building Tier 1. None are regressions; all are worth a deliberate
fix rather than a drive-by one.

- **Very small results render as long zero-strings.** `formatQuantity` uses
  `Intl.NumberFormat` with 8 significant digits and no notation, so 1 GB in
  pebibytes is `0.00000088817842` and 1 m² in square miles is
  `0.00000038610216`. Pre-existing — mass has always done this for mg → US tons
  — but the wide dimensions make it obvious. A `notation: "scientific"`
  threshold in `app/utils/format.ts` would fix it, and would change every tool's
  output, so it is its own change.
- **The `scss` test project fails intermittently, about one run in four.**
  `test/scss/scss.spec.ts` dies with `Compiler caused error: Invalid protobuf:
  illegal tag: field no 0 wire type 0` from `sass-embedded`, and the run
  reports a failed *file* with zero failed tests — which is easy to misread as
  a real regression. It is the embedded Sass compiler process, not the SCSS:
  measured at 2 failures in 8 full-suite runs on an otherwise untouched tree,
  and 0 in 12 when the `scss` project runs on its own, so it wants the other
  projects running alongside it. Worth pinning down before `bun run test` goes
  into CI, or the pipeline will go red at random. `sass-embedded` and `sass`
  are both direct devDependencies at slightly different versions
  (`^1.100.0` and `^1.102.0`), which is the first thing to rule out.
- **New auto-imported exports need `nuxi prepare` before typecheck.** `.nuxt`'s
  generated types are what `vue-tsc` resolves auto-imports against, so a
  freshly added export in `app/utils/` fails typecheck until they are
  regenerated. commitguard runs typecheck pre-commit, so this bites at commit
  time.
- **`ToolNav.vue`'s horizontal scroll — fixed, and this time it stays
  fixed.** At 13 tools the flat row came to 1940px of links and scrolled at
  *every* viewport width, 1920px included. The nav now lists **groups**, each
  opening a dropdown, and a group holding one tool renders as a direct link to
  it. The top level is 455px and `$single-row` came *down*, from 78rem to
  60rem. The width is now bounded by the number of categories rather than the
  number of tools, so Tier 2 landing in full does not touch it — and
  `toolsByGroup()` finally has a caller that is not a test.

---

## Out of scope

Recorded so the reasons survive.

- **Currency converter.** Needs live exchange rates, which needs a server and a
  cache. Everything else here runs in the browser and sends nothing; this would
  be the first exception, and it would need the privacy policy amended. Revisit
  deliberately.
- **India-specific tools** — GST calculator, EMI/loan calculator, land-area
  units (gaj, cent, guntha, bigha, ground). High intent, but a second pass after
  the generic set is in.
- **Platform UX** — Ctrl+K tool search, favourites, PWA/offline. The grouped
  nav took the urgency out of search: it was being considered as a *fix* for
  the overflowing row, which was the wrong job for it. Search is an
  accelerator for someone who already knows the tool's name, and it adds no
  crawlable links — it belongs on top of a browsable nav, not instead of one.
  Worth building when the tool count makes scanning a dropdown slow, which is
  not yet.
- **Test and CI infrastructure** — Playwright E2E, an axe-core runner in the
  repo, `seo:verify` and Lighthouse wired into CI.
