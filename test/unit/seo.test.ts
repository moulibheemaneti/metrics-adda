import { describe, expect, it } from "vitest"
import en from "../../i18n/locales/en.json"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, truncate } from "../../app/utils/seo"

describe("truncate", () => {
   it("leaves text within the limit untouched", () => {
      expect(truncate("Metrics Adda", 60)).toBe("Metrics Adda")
   })

   it("cuts on a word boundary rather than mid-word", () => {
      expect(truncate("Metrics Adda for teams", 20)).toBe("Metrics Adda for…")
   })

   it("never exceeds the limit", () => {
      expect(truncate("a".repeat(200), 40)).toHaveLength(40)
   })
})

/// The authored SEO strings live in the locale files, so the budgets are
/// checked against those rather than against a hand-copied duplicate: a
/// translation that overflows would be clipped in the SERP.

describe("authored SEO copy", () => {
   it("keeps every title within the SERP limit", () => {
      for (const [page, seo] of Object.entries(en.seo)) {
         expect(seo.title.trim(), `${page} title is empty`).not.toBe("")
         expect(seo.title.length, `${page} title overflows`).toBeLessThanOrEqual(SEO_TITLE_MAX)
      }
   })

   it("keeps every description within the SERP limit", () => {
      for (const [page, seo] of Object.entries(en.seo)) {
         expect(seo.description.trim(), `${page} description is empty`).not.toBe("")
         expect(seo.description.length, `${page} description overflows`)
            .toBeLessThanOrEqual(SEO_DESCRIPTION_MAX)
      }
   })

   it("leaves no unrendered placeholders", () => {
      for (const seo of Object.values(en.seo)) {
         expect(seo.title).not.toMatch(/\{\w+\}/)
         expect(seo.description).not.toMatch(/\{\w+\}/)
      }
   })
})

/// Every locale has to carry the whole message vocabulary: a missing key
/// falls back to raw English, which is exactly the duplicate-content
/// problem the translations exist to solve. Add a code here when you add
/// a locale to `nuxt.config.ts`.

describe("locale coverage", () => {
   const LOCALES = ["en"] as const

   /** Every leaf path in a message object, as dot notation. */
   const paths = (node: unknown, prefix = ""): string[] =>
      typeof node === "object" && node !== null
         ? Object.entries(node).flatMap(([key, value]) =>
            paths(value, prefix ? `${prefix}.${key}` : key),
         )
         : [prefix]

   const expected = paths(en)

   it.each(LOCALES)("%s translates every message", async(locale) => {
      const messages = (await import(`../../i18n/locales/${locale}.json`)).default

      expect(paths(messages).sort()).toEqual(expected.sort())
   })
})
