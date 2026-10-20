# Category hub pages

**Shipped.** Four hubs at `/converters`, `/calculators`, `/text-tools` and
`/generators`, plus the chip row and the trimmed home sections. What the plan
got wrong is recorded under [What changed in the
building](#what-changed-in-the-building) rather than edited out.

## Context

The home page was one grid of every tool. At eighteen cards that scanned as a
wall: a reader had to read all eighteen names to find out the site has
converters at all, and the only heading over them was "All tools", which says
nothing a visitor did not already know from arriving.

**The grouped home page has shipped** — see [What already
landed](#what-already-landed). This plan is the other half, and the two are
deliberately separate because they do different jobs:

- **Grouping the home page** is aisle signs inside the shop. It helps someone
  already on the page find the right tool faster, and it gives the page six
  keyword-bearing `<h2>`s it did not have.
- **Hub pages** are the listing in the directory outside. `/converters` is a
  URL: its own prerendered HTML, its own `<title>`, its own `<h1>`, its own
  sitemap entry. That is what can answer a search for *"unit converter"* or
  *"online text tools"* — plural, browse-shaped queries that no single tool
  page is built to serve and that the home page cannot serve six of at once.

Roadmap step 2, and it is genuinely independent of step 1 (query-param deep
links) despite the numbering: nothing here needs conversion state in the URL.

## What already landed

The grouping change, which is also most of the groundwork:

| File | Change |
| --- | --- |
| `app/utils/tools.ts` | `occupiedGroups()` — the groups holding at least one tool, in registry order |
| `app/composables/useToolGroups.ts` | Routed through `occupiedGroups()` instead of its own filter |
| `app/utils/copy.ts` | `GroupCopy` and a `COPY.groups` block — a heading and a lede per group |
| `app/components/ToolGroupSection.vue` | New. Heading, lede and cards for one group |
| `app/pages/index.vue` | Six sections in place of one grid; `COPY.home.toolsHeading` gone |
| `app/assets/scss/layout/_page.scss` | `.card-grid--fill` |
| `test/unit/tools.test.ts` | Group copy guards, and `occupiedGroups`'s own behaviour |

Two things in there are worth knowing before building on them.

**`COPY.groups` is not `COPY.nav.groups`, on purpose.** The nav labels are
short because the header row's width is bounded by them — `"Text"` is a column
header, not a phrase anyone types into a search box. `COPY.groups` holds the
category as a reader meets it (`"Text tools"`), which is what a hub page's
`<h1>` wants. The wording is written once so the section and the hub cannot
drift apart about what a category is called. **This is the piece the hub pages
actually reuse** — more than the markup, which is a heading tag's worth of
difference either way.

**`.card-grid--fill` exists because `auto-fit` collapses empty tracks.** One
card in a three-column row became one card three columns wide, which read as a
banner rather than as the smallest group on the page. `auto-fill` keeps the
tracks. The default stays `auto-fit` because the block using it — the
related-tools list at the foot of every tool page — is always full.

---

## Decisions

### Only groups with two or more tools get a hub

`health` and `security` hold one tool each. A hub page for either is a page
whose entire content is a heading, a line of prose and one card pointing at
`/bmi-calculator` — which is thin content that competes with the tool page it
links to, on a domain that cannot afford to spend crawl budget proving it
publishes filler.

So: **four hubs, not six.** `/converters` (8 tools), `/text-tools` (4),
`/calculators` (2), `/generators` (2). A group crosses the threshold when its
second tool lands, which is one more reason the route list is derived rather
than hand-written.

Two is already thin, and `calculators` and `generators` are there on
sufferance — they are included because the roadmap's next tools land in
`calculators` and the developer cluster would grow `text`, so both are about to
be less marginal, not more. If Search Console shows either hub impressed and
never clicked after a couple of months, drop it rather than padding it.

This is the one decision here the roadmap does not raise at all, and it is the
one most likely to be got wrong by shipping all six for symmetry.

### Route slugs are their own field, not the group id

The group ids are `converters`, `calculators`, `text`, `generators`. Three of
those are usable as routes and one is not: `/text` is not what anyone searches
for, and it reads as a page about text rather than a page of text tools. The
search term is *"text tools"*.

So the route segment cannot be `ToolGroup` cast to a string. Add it to the
registry beside the group list:

```ts
/** Hub route per group, for the groups that have one. */
export const GROUP_ROUTES = {
   converters: "converters",
   text: "text-tools",
   calculators: "calculators",
   generators: "generators",
} as const satisfies Partial<Record<ToolGroup, string>>
```

`Partial` is what encodes the previous decision in the type system: `health`
and `security` are absent, and `hubGroups()` is `occupiedGroups().filter((g) =>
g in GROUP_ROUTES)`. Adding a hub is then one line here, and everything
downstream — pages, sitemap, verify script, tests — follows from it.

Keep `/converters` rather than `/unit-converters`: the `<h1>` carries "Unit
converters" already, the shorter path is the one a person would guess, and
every tool under it already has "converter" in its own slug.

### Six page files, not one `[group].vue`

A dynamic `app/pages/[group].vue` is fewer files and the wrong shape here.

It matches *everything* at the site root, so `/converters` and
`/not-a-real-page` hit the same route. That needs `definePageMeta({ validate })`
to reject unknown groups, and getting that wrong turns every genuine 404 into
an empty hub page — a soft 404, which is worse than the 404 it replaced because
Google indexes it. The tool routes themselves are safe (static files win over
dynamic ones in Nuxt's route ranking), but the failure mode is invisible in
development, where you only ever type URLs that exist.

Explicit files also match what the repo already does: eighteen tool pages are
eighteen files, and `tools.ts` says the site is flat by design. Four more files
of roughly fifteen lines each is not the cost worth avoiding.

Absorb the repetition the way `ToolShell.vue` already does for tool pages — a
`HubShell.vue` taking the group, leaving each page as its SEO call and one
component. If that shell ends up thinner than its own props, inline it and keep
the four files dumb.

### `SEO` stays a closed map — hubs are not the case that breaks it

The roadmap flags that `SEO` is `Record<PageKey, SeoCopy>` and that dynamic
routes cannot key into it. **True, and it does not apply here.** That
constraint bites on pair and value routes, where the page set is a
cross-product computed at build time. Hubs are a fixed set of four, known at
authoring time, so they are ordinary entries:

```ts
export type PageKey = ToolKey | GroupPageKey | "home" | "privacy" | "about" | "contact"
```

Which means hub titles and descriptions are covered by the existing
`test/unit/seo.test.ts` budgets for free, rather than needing the sampled
generator check that steps 3 and 4 will. Do not reach for a generator function
here — it would retire a type-checked guard to solve a problem four hand-written
entries do not have.

Titles have to fight the tool pages for the same words without duplicating
them. `/weight-converter` is already *"Weight Converter: kg, lb, oz, g &
stone"*; the hub is the plural, so lead with the category and the count, e.g.
*"Unit Converters — 8 Free Online Tools"*. Budgets are 60 and 155 characters
and the test enforces both.

### Linking is the point, and `crawlLinks` makes it the whole job

This was the surprise: **the sitemap needs no configuration at all.**

`nuxt.config.ts` sets `prerender.crawlLinks: true` with `routes: ["/",
"/llms.txt"]`. Every page reachable by link from `/` is prerendered, and the
sitemap is built from what was prerendered. So linking the hubs from the home
page is simultaneously the internal-linking win, the prerender trigger and the
sitemap entry — one change, three results, no `sitemap.urls` array and no
`server/api/__sitemap__/urls` route.

That last part matters beyond convenience: the roadmap treats introducing a
`server/` directory as a decision that needs making deliberately, because the
site's promise is that it is client-only. Hub pages do not raise the question.
Pair and value routes still will, because a curated `POPULAR_PAIRS` cross-product
is not something a crawler can discover from links that do not exist yet.

Three links, in descending order of value:

1. **Each home section heading becomes a link to its hub.** This is the one
   that does the work. `ToolGroupSection` grows an optional `to` prop; absent,
   the heading stays plain text, which is what the two hub-less groups need.
2. **Each hub links back to `/` and across to the other hubs.** A hub with only
   downward links is a leaf; the sideways links are what make the four read as
   one layer.
3. **The related-tools block at the foot of each tool page gains its own hub
   link.** Cheapest of the three and the one that puts a hub link on all
   eighteen tool pages at once — "More converters →" under the cross-links.

Leave `ToolNav.vue` alone for now. A "View all" row inside each dropdown is
defensible, but the nav's width budget is already contested (see the roadmap's
[six-group cap](../roadmap.md#what-ordering-by-demand-runs-into)) and the
dropdown is not where the crawl-budget argument applies.

### Heading level is a prop, not a second component

`ToolGroupSection` renders an `<h2>` because on the home page it sits under the
hero's `<h1>`. On a hub page the same heading *is* the `<h1>`. Give it
`heading?: "h1" | "h2"` defaulting to `"h2"` and render through `<component
:is>`.

The alternative — hub pages use the existing `.page-header` block for their
`<h1>` and lede, and render the grid themselves — is also fine and is what tool
pages do. Pick the prop version so the heading/lede/grid relationship stays
described in one file; pick the other if `HubShell` collapses to nothing.
Either way `COPY.groups` is read once.

---

## What changed in the building

Five departures from the plan above, and one trap it did not see.

- **`HubShell.vue` was not worth writing.** Each hub page came to twelve
  lines — a `ToolGroupSection`, a sibling chip row, and its SEO calls — and a
  shell around that would have been thinner than its own props. The plan said
  to inline it if that happened, and it happened.
- **The heading's hub link needed no prop.** `ToolGroupSection` derives it:
  linked when the group has a hub *and* the heading is an `h2`. As an `h1` the
  section is the hub page, and a heading linking to the page it sits on is a
  dead control that reads as a live one.
- **The chip row was not in this plan at all.** It came out of a separate
  question — whether the home page should use tabs — and answers the same
  concern: it makes the page's length stop mattering without hiding a single
  card. `CategoryChips.vue` serves both it and the hub pages' sibling links.
- **Sibling links turned out to be load-bearing, not a nicety.** A hub with
  only downward links is a leaf, and the page looked it: eight cards and
  then nothing. The chip row at the foot fixes the crawl shape and the
  emptiness in one block.
- **Trimming had to refuse to hide a single card.** A bare `slice(0, 3)` turns
  "show three" into "hide one" on a four-tool group — a whole row of link and
  whitespace spent to save one card, and a reader sent to another page for
  something that would have fitted. `ToolGroupSection` shows everything when
  the overflow would be one. In practice only `converters` trims today, which
  is the rule working rather than failing.
- **The trap: `vue/multi-word-component-names`.** Three of the four routes are
  single words, and the rule rejects them. `eslint.config.mjs` already carried
  an `ignores` list for exactly this — `about` and `contact` are routes rather
  than component names — so the fix was extending that list, not renaming
  `/converters` to something a lint rule preferred.

**The central bet paid off.** `prerender.crawlLinks` reached all four hubs
from the home page's links: `.output/public/converters/index.html` and its
three siblings exist, `sitemap.xml` went from 22 URLs to 26, and
`nuxt.config.ts` was not touched. No `sitemap.urls` array, no `server/`
directory, no decision about the client-only promise.

**What the trimming actually saved** is worth recording because it is less
than it sounds: the home page went from 2726px to 2593px at 1280px wide (5%)
and 4104px to 3702px on a 390px phone (10%). The page is long because it has
six headings and six ledes, not because any one group is huge — `converters`
is the only group big enough to trim at all. The chip row, not the trim, is
what makes the length bearable.

## Files touched

| File | Change |
| --- | --- |
| `app/utils/tools.ts` | `GROUP_ROUTES`, `HubGroup`, `isHubGroup`, `hubPath`, `hubGroups`, `groupSectionId` |
| `app/utils/copy.ts` | `GroupPageKey`, widened `PageKey`, four hub `SEO` entries, `GroupCopy.plural`, `common.seeAll` / `otherCategories` / `allTools`, `home.categoriesLabel` |
| `app/components/ToolGroupSection.vue` | `heading` and `limit` props, hub-linked heading, overflow link, `scroll-margin` for the anchors |
| `app/components/CategoryChips.vue` | New. The chip row, in both its anchor and hub forms |
| `app/components/ToolShell.vue` | Hub link under the cross-links, on all eighteen tool pages |
| `app/pages/converters.vue`, `calculators.vue`, `text-tools.vue`, `generators.vue` | New |
| `app/pages/index.vue` | Chip row, and `SECTION_LIMIT` passed to each section |
| `eslint.config.mjs` | Three route-named pages added to the `multi-word-component-names` ignores |
| `scripts/seo/verify.sh` | `HUB_ROUTES`, derived from `hubGroups()` |
| `test/unit/tools.test.ts` | Hub registry guards, and `groupSectionId`'s fragment shape |

## Verification

All run against the production build, not the dev server.

- `bun run test` — 615 passing. The SERP budgets picked up the four hub
  entries without being touched, which is the closed `SEO` map paying off.
- `bun run lint`, and `bun --bun nuxt prepare` before `bun run typecheck`.
  The prepare step is not optional: `GROUP_ROUTES`, `hubGroups` and
  `groupSectionId` are new auto-imported exports, `vue-tsc` resolves
  auto-imports against `.nuxt`'s generated types, and commitguard runs
  typecheck pre-commit — so skipping it fails at commit time.
- `bun run build`, then all four of `.output/public/<hub>/index.html` present
  and `sitemap.xml` at 26 `<loc>` entries, up from 22. **This is the check
  that matters** — if `crawlLinks` had not reached a hub, the page would not
  be prerendered, would not be in the sitemap, and none of this would work.
- `bun run seo:verify` — 287 checks, 0 failures, hubs included: title,
  description, canonical, OG tags, JSON-LD, sitemap membership and a
  rendered OG image each.
- Anchor jumps measured in the browser at 390px, 700px and 1280px. The
  heading lands 16px clear of the sticky header at each, including the
  700px case where the nav takes a second row and the bar is 88px rather
  than 57px.
- Home page chips checked against the rendered section ids: six chips, six
  sections, every fragment resolving. Each hub's sibling row excludes
  itself and offers the other three plus `/`.

**One gotcha worth knowing for next time:** a stale `.output` will happily
serve the previous build's HTML while the log says "Build complete". If a
change is not in the rendered output, check that the build actually ran
before debugging the change.

## Open questions

- **Which four, once traffic exists.** The ≥2-tools rule is a proxy for "has
  enough behind it to be worth a page". Search Console impressions are the real
  measure and there are none yet, which is the same reason the roadmap parks
  the rest of programmatic SEO. Re-check this list against real data before
  building step 3.
- **Whether `/calculators` and `/generators` survive.** Two cards each. See
  above — the argument for them is what is about to land, not what is there.
- **Whether the home page should keep all six sections once four are also
  hubs.** It should, for now: the sections are how someone on the page finds a
  tool, and the hubs are how someone not on the page finds the category. They
  are not redundant with each other. Revisit only if the home page gets long
  enough that the sections below the fold stop being read, which is measurable
  and currently unmeasured.
