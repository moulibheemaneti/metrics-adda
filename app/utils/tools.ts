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

export type ToolGroup = "converters" | "text" | "security"

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
