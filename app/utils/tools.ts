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
 * Every tool except the one given — the cross-links at the foot of each
 * tool page. Keeping them exhaustive is deliberate at this size: it gives
 * every page an inbound link from every other, which is what a new domain
 * needs for its pages to be discovered.
 */
export function relatedTools(slug: string): ToolEntry[] {
   return TOOLS.filter((tool) => tool.slug !== slug)
}
