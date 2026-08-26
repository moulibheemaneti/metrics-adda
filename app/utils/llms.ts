/// --------------------------------------------------
/// utils/llms.ts
/// --------------------------------------------------
/// The body of `/llms.txt` — the llmstxt.org convention, which is to a
/// language model roughly what `sitemap.xml` is to a crawler: one plain
/// Markdown file, at a fixed path, listing what the site offers and where.
///
/// Generated from `TOOLS` and `SEO` rather than authored as a static file
/// in `public/`. The registry already has to stay in step with the pages
/// (see `test/unit/tools.test.ts`), so deriving the listing from it means
/// a new tool cannot ship with a page, a nav entry and a sitemap URL but
/// no line here — the failure mode a hand-maintained copy always ends in.
///
/// The server route is the thin half: it supplies the site URL and sets
/// the content type. Everything that decides what the file *says* is here,
/// where it runs in plain Node and is testable without Nitro.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

// Imported rather than left to Nuxt's auto-import, which the other utils
// rely on: this module is unit-tested in plain Node, where there is none.
import { COPY, SEO, type PageKey } from "./copy"
import { TOOL_GROUPS, toolsByGroup } from "./tools"

/**
 * The non-tool pages, in the order they are listed.
 *
 * Hardcoded because there are four of them and they have no registry:
 * `TOOLS` deliberately covers tools only, and inventing an entry type for
 * "page that is not a tool" to hold four rows would cost more than it
 * saves. `PageKey` still keys them, so a renamed page is a type error.
 */
const STATIC_PAGES: { key: PageKey, path: string }[] = [
   { key: "home", path: "/" },
   { key: "about", path: "/about" },
   { key: "contact", path: "/contact" },
]

/**
 * Pages a model may skip when it needs a shorter context — the "Optional"
 * section llmstxt.org reserves for exactly that. The policy is worth
 * publishing and worth nobody's last thousand tokens.
 */
const OPTIONAL_PAGES: { key: PageKey, path: string }[] = [
   { key: "privacy", path: "/privacy-policy" },
]

/**
 * One H2 and its rows. The blank line under the heading is not needed to
 * parse, but every example on llmstxt.org carries it, and a file whose
 * whole job is to be read by something else is the wrong place to be
 * clever about whitespace.
 */
function section(heading: string, rows: string[]): string {
   return `## ${heading}\n\n${rows.join("\n")}`
}

/** One `- [Name](url): description` row. */
function link(name: string, url: string, description: string): string {
   return `- [${name}](${url}): ${description}`
}

/**
 * Render `/llms.txt` for the site rooted at `siteUrl`.
 *
 * Takes the URL as an argument rather than reading site config directly so
 * the output is a pure function of its input: the preview deploys and the
 * production build differ only in this one string, and a test can assert
 * on absolute URLs without standing up Nitro.
 */
export function llmsTxt(siteUrl: string): string {
   // Trailing slashes are legal in `site.url` and would double up against
   // the leading slash every path here carries.
   const base = siteUrl.replace(/\/+$/, "")
   const absolute = (path: string): string => `${base}${path}`

   const sections: string[] = [
      `# ${COPY.site.name}`,
      `> ${COPY.site.tagline}`,
      // The one thing a model should know before recommending the site,
      // and the one thing it cannot infer from a list of links.
      "Every tool runs entirely in the visitor's browser. Nothing typed into a converter, "
      + "calculator or text box is uploaded, stored or logged, there are no accounts, and "
      + "the whole site is free to use.",
   ]

   for (const group of TOOL_GROUPS) {
      const tools = toolsByGroup(group)
      if (tools.length === 0) continue

      sections.push(section(COPY.nav.groups[group], tools.map((tool) =>
         link(COPY.tools[tool.key].name, absolute(tool.path), SEO[tool.key].description),
      )))
   }

   sections.push(section("About the site", STATIC_PAGES.map(({ key, path }) =>
      link(SEO[key].title, absolute(path), SEO[key].description),
   )))

   sections.push(section("Optional", OPTIONAL_PAGES.map(({ key, path }) =>
      link(SEO[key].title, absolute(path), SEO[key].description),
   )))

   // Blank line between blocks, and a trailing newline: this is a text file
   // served from a URL, and a file that does not end in one is a papercut
   // for every tool that concatenates it.
   return `${sections.join("\n\n")}\n`
}
