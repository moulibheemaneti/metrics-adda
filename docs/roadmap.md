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

**Where things stand:** 18 tools. Tier 1 is done; Tier 2 has shipped seven of
its panels, with three queued and two deferred. Programmatic SEO has not
started.

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

### What batching taught

The three-pass sequencing question is settled — Tier 2 has been shipping in
small batches for the same reasons. Two conclusions still bind on future work.

- **Derive, don't hand-edit.** `scripts/seo/verify.sh` reads its routes from
  `TOOLS` via `bun -e`, and `test/unit/tools.test.ts` iterates `TOOLS` and
  `DIMENSIONS`, so both picked up every later dimension untouched. Deriving
  also fixed a real gap: `/typing-speed-test` had shipped without its SEO
  surface ever being checked.
- **Copy is the part that scales badly, not code.** Each tool is ~10 unit
  labels, 3 FAQ answers with real facts in them, and a title/description inside
  the 60/155 budgets `test/unit/seo.test.ts` enforces. That is why several in
  one sitting is the wrong shape.

---

## Tier 2 — new panels, no engine change

### Shipped

| Route | Notes |
| --- | --- |
| `/case-converter` | Ten cases, split into text and identifier families |
| `/bmi-calculator` | Plus the advanced body-composition mode; added `"health"` |
| `/lorem-ipsum-generator` | Seeded generation, so it server-renders |
| `/uuid-generator` | v4, with a `getRandomValues` fallback |
| `/percentage-calculator` | Four modes over one pair of fields; added `"calculators"` |
| `/age-calculator` | Calendar arithmetic with no `Date` in it; second `"calculators"` tool |
| `/base64-encoder` | Both directions, UTF-8 throughout; filed under `"text"` |

The generators added a `"generators"` group, and the percentage calculator a
`"calculators"` one — which takes the header's top level to six, the cap
`test/unit/tools.test.ts` enforces. Every group after this one has to displace
another; see [What ordering by demand runs into](#what-ordering-by-demand-runs-into).
`password-generator` was left in `"security"` rather than moved into
`"generators"` — it is arguably a generator too, but moving a shipped tool
changes a nav label people may already recognise, and that wants to be its own
decision rather than a side effect of this one.

### Still to build

Ordered by search demand, not by build cost. The order used to be
percentage → age → the encoders, which was picked by how little each one
needed: pure arithmetic first, then the trivial ones, with `/json-formatter`
and `/hash-generator` trailing because they are more panel than the rest.
That reads as a priority list and was never one. The encoders being cheap to
build is not a reason to ship them ahead of the tools people actually search
for.

1. **`/json-formatter`** — **parked on the nav decision below, not on the
   work.** Format, minify, validate, with the error position. Highest intent
   of the developer cluster and the one people bookmark. `JSON.parse`
   carries validity; the work is reporting the error position and the editor
   affordances, not the parsing.
2. **`/url-encoder`** — percent-encoding both ways. The `"text"` group took
   `/base64-encoder`, and this one fits beside it on the same argument.
3. **`/hash-generator`** — SHA-1/256/384/512 via `crypto.subtle.digest`.
   `app/utils/password.ts` already establishes how WebCrypto is used here.
   The one item here that `"text"` cannot honestly hold.

The encoders were listed to ship together and did not. Writing one tool's
copy — a lede, four FAQ answers with real facts in them, and a title and
description inside the SERP budgets — is the part of a tool that takes the
time, and doing two in a sitting is the shape this file already warned
against under [What batching taught](#what-batching-taught). The code for
the second one is genuinely trivial; the copy is not.

### Deferred, and why

- **`/qr-code-generator`** — deferred on the dependency. It is the only item
  above needing one, and the call is to stay dependency-free for now. `uqr`
  (unjs, zero-dep, MIT, SVG output) is the candidate when that is revisited;
  the alternatives are heavier and drag in Node-only code.
- **`/markdown-preview`** — the obvious sixth developer tool, and the one that
  does not fit. A preview needs a parser *and* an HTML sanitizer, neither of
  which can be hand-rolled safely, so it is a two-dependency ask where the QR
  code was a one-dependency one. Worse, it renders visitor input as HTML in
  the tool whose entire pitch is that visitor input is safe here: an unescaped
  `<script>` in someone's pasted README is an XSS hole in exactly the page
  claiming there is nowhere for the text to go. Revisit only alongside the
  dependency rule, not around it.

### What ordering by demand runs into

- **The six-group cap is not currently holding the line it was written for,
  and this was measured rather than assumed.** `test/unit/tools.test.ts` caps
  the header's top level at six occupied groups, on the reasoning that the
  count of categories bounds the nav's width. `"calculators"` took the sixth.
  But measured in the browser at 960px — `$single-row` in
  `app/layouts/default.vue`, where the three-across header starts — the six
  groups need 650px of track and get 466px, so **the nav already scrolls
  horizontally there today**. At 1280px it fits, with about 160px spare.
  Two things follow. First, a seventh group makes an existing problem worse
  rather than introducing a new one, so the cap is not the clean gate it
  looks like. Second, the widest items are not groups at all: the
  single-tool rule renders `"security"` and `"health"` as their tool names,
  so "Password Generator" is 161px and "BMI Calculator" 120px — 281px of
  that 650 between them. Whatever is decided about a `"developer"` group,
  the cheaper fix is that rule.
- **So the developer cluster is still a group decision, with three ways
  out.** File them under existing groups — `"text"` holds `/base64-encoder`
  honestly enough and would hold `/url-encoder`, but not a hash generator.
  Raise the budget deliberately, accepting the 960px scroll. Or consolidate:
  moving `bmiCalculator` into `"calculators"` empties `"health"`, which both
  frees the slot and removes a 120px item, so it is the only option that
  does not make the nav wider. That last one is the same move the
  `password-generator` note above parks, and it wants the same treatment — a
  decision of its own, not a side effect of shipping a JSON formatter.
- **Developer traffic monetises worse than general traffic.** Revenue is one
  AdSense slot per page; ad-blocking among developers runs far above the
  general rate and the CPMs are lower to begin with, so a `/json-formatter`
  visit is worth materially less than a `/percentage-calculator` one. Not a
  reason to skip the cluster — the client-only story is a real differentiator
  against incumbents that round-trip pasted JSON to a server, and it belongs
  in the H1 — but a reason to keep it behind the general-audience calculators
  rather than in front of them. Which is what the order above does.
- **Head terms may not be winnable on this domain yet.** Every tool on this
  list competes with an entrenched single-purpose site. A domain without
  authority wins long-tail before it wins the bare query, which is an argument
  for the pair routes in Programmatic SEO rather than for more head-term
  tools. That section is parked pending traffic — but once Search Console has
  a few months in it, this ordering should be re-checked against real
  impressions rather than against priors.

The nav does not otherwise constrain the order. `ToolNav.vue` lists groups
rather than tools, so its width is bounded by the number of categories, and
the rest landing at once does not bring back the horizontal scroll that the
flat row had at 13 tools — the six-group cap above is the only limit in play.

### What the case, BMI, lorem and UUID panels taught

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

### What the base64 encoder turned out to teach

- **`btoa` is not a base64 encoder.** It takes a *binary string* — one
  character per byte — and throws outright above code point 255, so
  `btoa("café")` is an exception rather than an encoding. Text has to become
  UTF-8 bytes first and those bytes a binary string. The mangled-emoji bug
  in half the base64 tools on the web is that missing step, and it is the
  reason this one is worth having rather than being a two-line wrapper.
- **Two failures with different fixes need two messages.** Input that is not
  base64 at all and input that is valid base64 carrying bytes which are not
  UTF-8 — a PNG, a key — are unrelated problems. Reporting both as "invalid"
  sends someone with a perfectly good token off to check the wrong thing.
  `TextDecoder` in fatal mode is what separates them; without `fatal` the
  second case comes back as a screenful of replacement characters.
- **Spreading a typed array into an argument list is a size-dependent
  bug.** `String.fromCharCode(...bytes)` works in every test written by hand
  and overflows the call stack somewhere in the tens of kilobytes. Chunking
  costs three lines. The unit test uses 200,000 characters, because a
  limit this one only fails past is not a limit a small fixture will find.
- **The registry guard needed widening, not relaxing.** `base64-encoder` is
  the first slug with a digit in it, and the kebab-case assertion in
  `test/unit/tools.test.ts` rejected it. The fix was a pattern that still
  rejects capitals, underscores and stray hyphens while allowing digits
  inside a segment — `sha256` will want the same. Relaxing the assertion to
  let one route through would have retired the guard by inches.

### What the calculators turned out to teach

- **"Today" is a third answer to the SSR question.** Lorem ipsum and UUIDs
  split it two ways — seeded so server and client agree, or generated after
  mount so no two visitors share a value. A date calculator is neither.
  Resolving `todayLocal()` during render bakes the *build* date into
  prerendered HTML and serves it as "today" for as long as that page stays
  cached; generating client-only hands a crawler an empty panel on a page
  whose whole value is the worked example. The answer is both: a fixed
  example in the SSR output, replaced by the real date in `onMounted`. It
  only works because the date sits in a field the reader can see, so the
  change reads as a default filling itself in rather than as the answer
  moving on its own — a readout with no visible input behind it does not get
  this option.
- **`Date` is the wrong type for a date.** `new Date("2000-01-01")` is UTC
  midnight and reads back as 1999-12-31 west of Greenwich, `getMonth()` is
  zero-based while every date string is not, and a day count taken by
  subtracting two timestamps is an hour out across a daylight-saving
  boundary. `utils/age.ts` holds dates as three numbers and counts days from
  the civil calendar directly; the only `Date` in it is `todayLocal()`, which
  reads local *parts* rather than a timestamp.
- **The obvious month-difference algorithm is wrong at the ends of months.**
  Subtracting the fields and borrowing when the days go negative fails from
  31 January to 1 March: it borrows February's 29 days to cover a 30-day
  shortfall and lands on minus one. Counting forward instead — the largest
  number of whole months that still lands on or before the target, then the
  days left over — has no such case, and gives the total-months figure for
  free. The test sweeps every day of a decade against a leap-day birth date,
  which is what caught it.
- **Where two conventions are both defensible, the FAQ has to pick one out
  loud.** A 29 February birthday falls on the 28th here in the three years
  out of four with no 29th; some jurisdictions use 1 March. Neither is
  wrong, so the answer is not to choose better but to say which was chosen.

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
   Still the cheapest new pages on this list: `toolsByGroup()` in
   `app/utils/tools.ts` already returns exactly what a hub page renders, and
   `ToolNav.vue` and `SiteMenu.vue` prove the grouping holds up in the UI. The
   win here is crawlable pages and a middle layer of internal linking between
   the home page and the tools — which matters more now that `/converters`
   alone would hold eight.
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
- **Anything else that blocks on a pipe may do what the `scss` flake did.**
  That one is fixed — sass-true now compiles with pure-JS `sass` rather than
  letting it default to `sass-embedded`, and `test/scss/scss.spec.ts` carries
  the reasoning. The general lesson outlived it: the failure was
  `sass-embedded` blocking on its child process through a worker thread and
  `Atomics.wait`, which is reliable under `node` and not under `bun --bun`,
  and `bun --bun` is how `bun run test` and CI run the suite. It surfaced as a
  failed *file* with zero failed tests, roughly one full-suite run in four. A
  dependency that shells out to a native helper and waits on it synchronously
  is the shape to be suspicious of.
- **New auto-imported exports need `nuxi prepare` before typecheck.** `.nuxt`'s
  generated types are what `vue-tsc` resolves auto-imports against, so a
  freshly added export in `app/utils/` fails typecheck until they are
  regenerated. commitguard runs typecheck pre-commit, so this bites at commit
  time.

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
- **Platform UX** — Ctrl+K tool search, favourites. The grouped
  nav took the urgency out of search: it was being considered as a *fix* for
  the overflowing row, which was the wrong job for it. Search is an
  accelerator for someone who already knows the tool's name, and it adds no
  crawlable links — it belongs on top of a browsable nav, not instead of one.
  Worth building when the tool count makes scanning a dropdown slow, which is
  not yet.

  **PWA/offline shipped** — see the PWA section in the README. It came out of
  this group early because it was the cheap half: the tools already run in the
  browser and send nothing, so it was packaging rather than a feature.
- **Capacitor, or any native rewrite.** The Play Store build is a Trusted Web
  Activity instead — see `docs/plans/android-twa-play-store.md`. Capacitor
  would bundle `.output/public` into the APK, which sounds tidier and is not:
  every content change would become a Play release with a review queue in
  front of it, where a TWA picks the change up from the next Vercel deploy.
  It would also mean dropping AdSense for AdMob if ads ever return, since
  AdSense is not permitted inside a plain WebView. Worth revisiting only if
  the app needs something the web cannot do — widgets, background work, or
  real offline-first storage.

- **Test and CI infrastructure beyond what CI already runs.** `ci.yml` covers
  lint, typecheck, `bun run test` and build. Still not wired up, and
  deliberately: Playwright E2E, an axe-core runner in the repo, and
  `seo:verify` / `seo:lighthouse` in CI — both of those need a built preview
  server in the job, which is a bigger step than adding a script call.
