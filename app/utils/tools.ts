/// --------------------------------------------------
/// utils/tools.ts
/// --------------------------------------------------
/// The site's tool registry — one array that the hub grid, the header nav
/// and every page's "other tools" block all read from.
///
/// Adding a tool means adding an entry here, a copy block in `copy.ts` and
/// a page file. `test/unit/tools.test.ts` fails if those drift apart, so a
/// tool can never end up listed in the nav with no page, or shipped with a
/// page and no search metadata.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

import type { ToolKey } from "./copy"

/**
 * Every group, in one array so nothing has to restate the list.
 *
 * `ToolGroup` derives from it rather than the other way round, which is
 * what lets `test/unit/tools.test.ts` check that the groups account for
 * every tool without hardcoding their names — the previous version listed
 * three by hand and would have silently under-counted the moment a fourth
 * arrived.
 */
export const TOOL_GROUPS = ["converters", "calculators", "text", "generators", "security", "health"] as const

export type ToolGroup = typeof TOOL_GROUPS[number]

export interface ToolEntry {
   /** URL segment, and the identifier used in `relatedTools`. */
   slug: string
   /** Route path. Always "/" + slug — the site is flat by design. */
   path: string
   /** Key into `COPY.tools`, `COPY.faq` and `SEO`. */
   key: ToolKey
   group: ToolGroup
}

export const TOOLS: ToolEntry[] = [
   {
      slug: "weight-converter",
      path: "/weight-converter",
      key: "weightConverter",
      group: "converters",
   },
   {
      slug: "height-converter",
      path: "/height-converter",
      key: "heightConverter",
      group: "converters",
   },
   {
      slug: "temperature-converter",
      path: "/temperature-converter",
      key: "temperatureConverter",
      group: "converters",
   },
   {
      slug: "speed-converter",
      path: "/speed-converter",
      key: "speedConverter",
      group: "converters",
   },
   {
      slug: "volume-converter",
      path: "/volume-converter",
      key: "volumeConverter",
      group: "converters",
   },
   {
      slug: "area-converter",
      path: "/area-converter",
      key: "areaConverter",
      group: "converters",
   },
   {
      slug: "time-converter",
      path: "/time-converter",
      key: "timeConverter",
      group: "converters",
   },
   {
      slug: "data-storage-converter",
      path: "/data-storage-converter",
      key: "dataStorageConverter",
      group: "converters",
   },
   {
      slug: "percentage-calculator",
      path: "/percentage-calculator",
      key: "percentageCalculator",
      group: "calculators",
   },
   {
      slug: "age-calculator",
      path: "/age-calculator",
      key: "ageCalculator",
      group: "calculators",
   },
   {
      slug: "word-counter",
      path: "/word-counter",
      key: "wordCounter",
      group: "text",
   },
   {
      slug: "case-converter",
      path: "/case-converter",
      key: "caseConverter",
      group: "text",
   },
   {
      slug: "base64-encoder",
      path: "/base64-encoder",
      key: "base64Encoder",
      group: "text",
   },
   {
      slug: "url-encoder",
      path: "/url-encoder",
      key: "urlEncoder",
      group: "text",
   },
   {
      slug: "typing-speed-test",
      path: "/typing-speed-test",
      key: "typingTest",
      group: "text",
   },
   {
      slug: "bmi-calculator",
      path: "/bmi-calculator",
      key: "bmiCalculator",
      group: "health",
   },
   {
      slug: "lorem-ipsum-generator",
      path: "/lorem-ipsum-generator",
      key: "loremIpsumGenerator",
      group: "generators",
   },
   {
      slug: "uuid-generator",
      path: "/uuid-generator",
      key: "uuidGenerator",
      group: "generators",
   },
   {
      slug: "hash-generator",
      path: "/hash-generator",
      key: "hashGenerator",
      group: "generators",
   },
   {
      slug: "password-generator",
      path: "/password-generator",
      key: "passwordGenerator",
      group: "security",
   },
]

export function toolsByGroup(group: ToolGroup): ToolEntry[] {
   return TOOLS.filter((tool) => tool.group === group)
}

/**
 * The groups that currently hold at least one tool, in registry order.
 *
 * The header nav, the phone sheet, the home page's grouped sections and —
 * when they land — the category hub pages all need the same answer to
 * "which categories does this site have", and a declared group holding
 * nothing is not one of them. All six are occupied today; the filter is
 * what lets a group be declared ahead of its first tool, or emptied by
 * moving its last one, without the nav growing a dead dropdown and the
 * home page a heading with nothing under it.
 *
 * Deriving it here rather than repeating the filter at each call site is
 * what keeps those places agreeing as groups fill and empty.
 */
export function occupiedGroups(): ToolGroup[] {
   return TOOL_GROUPS.filter((group) => toolsByGroup(group).length > 0)
}

/**
 * The DOM id of a group's section on the home page.
 *
 * Shared because two places need the same string and neither owns it: the
 * section sets it, and the chip row under the hero links to it. Derived in
 * both from here, so an anchor cannot go stale against the section it
 * points at — the failure mode otherwise is a link that silently does
 * nothing, which nothing catches but clicking it.
 */
export function groupSectionId(group: ToolGroup): string {
   return `tools-${group}`
}

/**
 * The hub route for each group that has one.
 *
 * Not the group id cast to a path. Three of these happen to match and one
 * does not: `/text` reads as a page about text rather than a page of text
 * tools, and "text tools" is the phrase people actually search for. The
 * nav's own label has the same split for the opposite reason — it is short
 * because the header row's width is bounded by it.
 *
 * `Partial` is load-bearing. A group holding one tool gets no hub: the
 * page would be a heading, a line of prose and a single card pointing at
 * the tool it duplicates, which is thin content competing with its own
 * target on a domain that cannot spare the crawl budget to prove it
 * publishes filler. `health` and `security` are absent for that reason and
 * become eligible when their second tool lands — at which point adding
 * them here is the whole change, because the pages, the sitemap, the SEO
 * smoke test and the home page's links all derive from this.
 */
export const GROUP_ROUTES = {
   converters: "converters",
   calculators: "calculators",
   text: "text-tools",
   generators: "generators",
} as const satisfies Partial<Record<ToolGroup, string>>

/** A group with a hub page. */
export type HubGroup = keyof typeof GROUP_ROUTES

export function isHubGroup(group: ToolGroup): group is HubGroup {
   return group in GROUP_ROUTES
}

export function hubPath(group: HubGroup): string {
   return `/${GROUP_ROUTES[group]}`
}

/**
 * Occupied groups that have a hub page, in registry order.
 *
 * Both conditions matter and they are not the same one: `GROUP_ROUTES`
 * says a group is worth a page, `occupiedGroups` says it currently has
 * anything to put on one.
 */
export function hubGroups(): HubGroup[] {
   return occupiedGroups().filter(isHubGroup)
}

/**
 * Every tool except the one given — the cross-links at the foot of each
 * tool page. Keeping them exhaustive is deliberate at this size: it gives
 * every page an inbound link from every other, which is what a new domain
 * needs for its pages to be discovered.
 */
export function relatedTools(slug: string): ToolEntry[] {
   return TOOLS.filter((tool) => tool.slug !== slug)
}
