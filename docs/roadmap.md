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

**Where things stand:** 20 tools across 24 pages, plus four category hubs —
28 URLs in the sitemap. Tier 1 is done; Tier 2 has shipped nine of its
panels, with one queued and two deferred. Programmatic SEO has started:
**step 2 has shipped**, step 1 has not, and they turned out not to depend on
each other. See [`plans/category-hub-pages.md`](plans/category-hub-pages.md).

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
| `/url-encoder` | Percent-encoding both ways, with the value-or-whole-URL choice made visible |
| `/hash-generator` | Four SHA digests at once and a checksum check; filed under `"generators"` |

The generators added a `"generators"` group, and the percentage calculator a
`"calculators"` one — which takes the header's top level to six, the cap
`test/unit/tools.test.ts` enforces. Every group after this one has to displace
another; see [What ordering by demand runs into](#what-ordering-by-demand-runs-into).
`password-generator` was left in `"security"` rather than moved into
`"generators"` — it is arguably a generator too, but moving a shipped tool
changes a nav label people may already recognise, and that wants to be its own
decision rather than a side effect of this one.

### Still to build

One left, and it is blocked on a decision rather than on the work.

1. **`/json-formatter`** — **parked on the nav decision below, not on the
   work.** Format, minify, validate, with the error position. Highest intent
   of the developer cluster and the one people bookmark. `JSON.parse`
   carries validity; the work is reporting the error position and the editor
   affordances, not the parsing.

The other two shipped together, which this file had twice argued against.
The warning was about copy and it held: the two modules and two panels were
the smaller half of the change, and the ledes, the nine FAQ answers and the
titles and descriptions inside the SERP budgets were the larger one. What
made the pair work anyway was that they are the same tool twice — both are
"convert this string, both directions, and report two different failures
separately" — so the second panel's design questions had all been answered
by the first. Two tools that happen to be next to each other on a list is
still the shape to avoid; two that share a structure is not.

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
- **Two of the three were filed under existing groups; the third is still
  the decision.** `/url-encoder` went into `"text"` beside `/base64-encoder`
  on the argument this section already made. `/hash-generator` went into
  `"generators"` — which was not one of the three ways out listed here. The
  text weighed only `"text"`, concluded it could not honestly hold a hash
  generator, and stopped there; it was right about `"text"` and wrong that
  the remaining options were a new group or a consolidation. A SHA digest is
  produced from input much as a UUID is produced from nothing, the tool's
  own name is "Hash Generator", and that is the shelf someone looks on. No
  new group, so the six-group cap and the 960px measurement below are
  untouched, and `/json-formatter` is now the only tool the decision blocks.
  The three ways out, for when it is taken: file it under an existing group —
  `"text"` cannot hold a JSON formatter any more honestly than it could hold
  a hash generator, so this one would need a real argument.
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

### What the URL encoder and hash generator taught

- **`crypto.subtle` is secure-context only; `crypto.getRandomValues` is
  not.** `app/utils/password.ts` reaches for the CSPRNG with no ceremony and
  was cited here as the precedent for "how WebCrypto is used in this repo".
  It is the wrong precedent: the random source is available everywhere, and
  `crypto.subtle` is simply absent over plain http — including the
  `http://192.168.x.x` address a phone uses to reach a dev server on the
  same network, which is exactly how this site gets tested on a phone. So
  `subtleCrypto()` returns null rather than the module throwing, and the
  panel has a message for it. Two halves of one API with different
  availability rules is the shape to check for.
- **SSR has a fourth answer, and it is to await it.** Lorem ipsum seeds a
  generator so server and client agree; UUIDs are deferred to `onMounted` so
  no two visitors share one; the age calculator ships a fixed example and
  replaces it after mount. A digest is none of those — perfectly
  deterministic, so a cached page stays correct forever, and *asynchronous*,
  which no `computed` can hold. Nuxt wraps pages in `<Suspense>`, so a
  top-level `await` in `setup` resolves before the HTML is written and the
  prerendered page carries all four real digests. The deciding question is
  no longer "would a repeated value be a bug" alone; it is also "can this be
  computed synchronously at all".
- **An async watcher needs a sequence guard, and nothing will tell you.**
  Four digests of a short string settle within one tick, so the naive
  `watch(text, async …)` looks correct in every test written by hand and in
  all ordinary use. Paste a megabyte, then immediately paste something
  short, and the slow result lands last and overwrites the value the input
  now shows. A monotonic request number costs three lines. Same family as
  the `String.fromCharCode(...bytes)` overflow the base64 encoder hit — a
  bug that only exists above a size no small fixture reaches.
- **An option that would be *wrong* is worse than one that is merely
  inert.** The base64 panel established that controls doing nothing in the
  current mode come off screen, because an inert control reads as a broken
  one. Percent-encoding raises the stronger case: writing a space as `+` is
  correct for a form value and wrong inside a path, where `+` is a literal
  plus and the result names a different resource. So the checkbox is absent
  outside component scope rather than ignored there, and `encodeUrl` does
  not honour the flag even if a caller passes it.
- **The same two-fault split, and again it had to be made before the
  call.** Base64 separates "not base64" from "valid base64 that is not
  text". Percent-encoding has the identical pair — a `%` not followed by two
  hex digits, versus well-formed escapes spelling bytes that are not UTF-8 —
  and `decodeURIComponent` throws one indistinguishable `URIError` for both.
  So the malformed case is detected by scanning the input beforehand rather
  than caught afterwards, which is also what lets the message name the
  thing the reader can actually see in their own input.
- **Reuse ran the other way for once.** `utils/base64.ts` gained
  `encodeBase64Bytes` so the hash panel could write a digest in base64, and
  `encodeBase64` now calls it. That keeps the chunked binary-string step —
  the part with the call-stack trap in it — as one implementation rather
  than two. A digest never spelled anything, so encoding it as text first
  would have corrupted it: the same bytes-are-not-characters mistake that
  module exists to prevent, arriving from the opposite direction.
- **The kebab-case guard's comment predicted the wrong file.** It was
  widened for `base64-encoder` with a note that `sha256` would want digits
  in a slug too. Neither slug needed it — `hash-generator` and `url-encoder`
  are both plain — but the algorithm ids did, and for the other reason
  entirely: `"SHA-256"` as an object key carries a hyphen, and
  `@stylistic/quote-props` is `consistent`, so one such key forces every key
  in that copy block to be quoted. Ids are `sha256` with a four-line map to
  the names WebCrypto actually takes. That is the volume converter's
  `"us-gal"` lesson landing in a different file.

---

## Programmatic SEO

**Step 2 has shipped; the rest is parked until there is real traffic to
reason about.** The order below is kept because the dependencies between the
remaining steps still hold — but step 1 was previously described as an SEO win, and it
is not one. Query parameters do not earn indexable pages: `site.url` in
`nuxt.config.ts` drives a path-only canonical, so `?from=kg&to=lb` would emit
`<link rel="canonical">` pointing back at the bare route, telling Google to
ignore it. The server HTML is identical for every parameter combination, and
none of those URLs are in the sitemap or linked internally. Its real value is
shareability plus the state-hydration refactor that steps 3 and 4 would reuse
— worth doing for those reasons, not for search.

The page-count play is steps 3 and 4, because a path is a real page: its own
prerendered HTML, its own title and H1, its own sitemap entry. Step 2 was the
cheapest genuine win and did not depend on step 1 at all — it shipped first,
and step 1 is still unbuilt.

**The steps are not a chain, and reading them as one cost time here.** The
numbering said each depends on the one above it; step 2 shipped on its own
and never touched query-param state. Only 3 and 4 have a real dependency
between them, and both want step 1 rather than each other's page shape.

1. **Query-param deep links** — `?from=kg&to=lb&value=70` in
   `UnitConverter.vue`. Prerequisite for everything below, and useful on its
   own: it makes a conversion shareable. Use `router.replace`, not `push`, so
   typing a value doesn't fill the back stack.
2. **Category hub pages** — ✅ **shipped.** `/converters`, `/calculators`,
   `/text-tools` and `/generators`, written up in
   [`plans/category-hub-pages.md`](plans/category-hub-pages.md). Three
   things it settled that bear on the steps below.

   - **The sitemap needed no configuration at all.**
     `prerender.crawlLinks` starts at `/` and the sitemap is built from
     what was prerendered, so linking the hubs from the home page was the
     internal-linking win, the prerender trigger and the sitemap entry in
     one change — `nuxt.config.ts` was not touched. The `server/`
     directory question further down is a pair-and-value-routes question
     and stays open; hubs never raised it.
   - **Not `/security-tools`.** That group holds one tool, and so does
     `health`; a hub over a single card is thin content competing with
     the tool page it links to. Four hubs, not six, and `GROUP_ROUTES`
     being `Partial` is where that rule lives.
   - **The closed `SEO` map was not the obstacle it looked like.** Four
     hubs are a fixed set known at authoring time, so they are ordinary
     entries and the 60/155 budget test covers them for free. The
     generator-function problem noted below is real for steps 3 and 4 and
     was not real here.
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
