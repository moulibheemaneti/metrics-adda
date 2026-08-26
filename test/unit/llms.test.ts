import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { COPY, SEO } from "../../app/utils/copy"
import { llmsTxt } from "../../app/utils/llms"
import { TOOLS } from "../../app/utils/tools"

const SITE = "https://www.metricsadda.com"

describe("llmsTxt", () => {
   it("opens with the site name as the only H1", () => {
      const lines = llmsTxt(SITE).split("\n")

      expect(lines[0]).toBe(`# ${COPY.site.name}`)
      expect(lines.filter((line) => line.startsWith("# "))).toHaveLength(1)
   })

   it("summarises the site in a blockquote", () => {
      expect(llmsTxt(SITE)).toContain(`> ${COPY.site.tagline}`)
   })

   /// The whole reason this is generated rather than authored: a tool that
   /// ships with a page and a sitemap entry but no line here would be
   /// invisible to anything reading the file.

   it("lists every tool in the registry", () => {
      const text = llmsTxt(SITE)

      for (const tool of TOOLS) {
         expect(text, `${tool.slug} is missing`).toContain(
            `[${COPY.tools[tool.key].name}](${SITE}${tool.path}): ${SEO[tool.key].description}`,
         )
      }
   })

   it("lists the static pages and the policy", () => {
      const text = llmsTxt(SITE)

      expect(text).toContain(`[${SEO.home.title}](${SITE}/)`)
      expect(text).toContain(`[${SEO.about.title}](${SITE}/about)`)
      expect(text).toContain(`[${SEO.contact.title}](${SITE}/contact)`)
      expect(text).toContain(`[${SEO.privacy.title}](${SITE}/privacy-policy)`)
   })

   it("groups the tools under the nav's own group names", () => {
      const text = llmsTxt(SITE)

      for (const label of Object.values(COPY.nav.groups)) {
         expect(text, `${label} section is missing`).toContain(`## ${label}`)
      }
   })

   it("emits absolute URLs with no doubled slash when the site URL has a trailing one", () => {
      const text = llmsTxt(`${SITE}/`)

      expect(text).toContain(`(${SITE}/about)`)
      expect(text).not.toContain("//about")
   })

   it("ends in a newline", () => {
      expect(llmsTxt(SITE).endsWith("\n")).toBe(true)
   })
})
