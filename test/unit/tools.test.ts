import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { COPY, SEO } from "../../app/utils/copy"
import { relatedTools, TOOLS, toolsByGroup } from "../../app/utils/tools"
import { DIMENSIONS } from "../../app/utils/units"

describe("TOOLS", () => {
   it("has a unique slug per tool", () => {
      const slugs = TOOLS.map((tool) => tool.slug)

      expect(new Set(slugs).size).toBe(slugs.length)
   })

   it("has a unique copy key per tool", () => {
      const keys = TOOLS.map((tool) => tool.key)

      expect(new Set(keys).size).toBe(keys.length)
   })

   it("derives every path from its slug", () => {
      for (const tool of TOOLS) {
         expect(tool.path).toBe(`/${tool.slug}`)
      }
   })

   it("uses lowercase kebab-case slugs", () => {
      for (const tool of TOOLS) {
         expect(tool.slug).toMatch(/^[a-z]+(-[a-z]+)*$/)
      }
   })
})

/// The registry, the copy and the pages are three separate files that have
/// to agree. This is the check that stops them drifting — a tool listed in
/// the nav with no copy would otherwise render blank labels in production.

describe("registry and copy agree", () => {
   it("gives every tool a copy block", () => {
      for (const tool of TOOLS) {
         const copy = COPY.tools[tool.key]

         expect(copy, `${tool.key} has no copy`).toBeDefined()
         expect(copy.name.trim()).not.toBe("")
         expect(copy.tagline.trim()).not.toBe("")
         expect(copy.heading.trim()).not.toBe("")
         expect(copy.lede.trim()).not.toBe("")
      }
   })

   it("gives every tool search metadata", () => {
      for (const tool of TOOLS) {
         expect(SEO[tool.key], `${tool.key} has no SEO entry`).toBeDefined()
      }
   })

   it("gives every tool at least two FAQ entries", () => {
      for (const tool of TOOLS) {
         const faq = COPY.faq[tool.key]

         expect(faq.length, `${tool.key} has too few FAQ entries`).toBeGreaterThanOrEqual(2)

         for (const entry of faq) {
            expect(entry.question.trim()).not.toBe("")
            expect(entry.answer.trim()).not.toBe("")
         }
      }
   })

   it("leaves no copy block orphaned by the registry", () => {
      const keys = new Set(TOOLS.map((tool) => tool.key))

      for (const key of Object.keys(COPY.tools)) {
         expect(keys.has(key as never), `${key} has copy but no registry entry`).toBe(true)
      }
   })
})

/// Unit labels come from the copy module while the maths comes from
/// `units.ts`, so a unit added to one and not the other would render an
/// empty <option> in the converter.

describe("every unit has a label", () => {
   for (const dimension of Object.values(DIMENSIONS)) {
      it(`labels every ${dimension.id} unit`, () => {
         for (const unit of dimension.units) {
            const label = COPY.units[dimension.id][unit.id]

            expect(label, `${dimension.id}.${unit.id} has no label`).toBeDefined()
            expect(label?.name.trim()).not.toBe("")
            expect(label?.symbol.trim()).not.toBe("")
         }
      })

      it(`labels no ${dimension.id} unit that does not exist`, () => {
         const ids = new Set(dimension.units.map((unit) => unit.id))

         for (const id of Object.keys(COPY.units[dimension.id])) {
            expect(ids.has(id), `${dimension.id}.${id} is labelled but not defined`).toBe(true)
         }
      })
   }
})

describe("toolsByGroup", () => {
   it("returns only tools in the requested group", () => {
      for (const tool of toolsByGroup("converters")) {
         expect(tool.group).toBe("converters")
      }
   })

   it("accounts for every tool across all groups", () => {
      const grouped = [
         ...toolsByGroup("converters"),
         ...toolsByGroup("text"),
         ...toolsByGroup("security"),
      ]

      expect(grouped).toHaveLength(TOOLS.length)
   })
})

describe("relatedTools", () => {
   it("excludes the current tool", () => {
      for (const tool of TOOLS) {
         const related = relatedTools(tool.slug)

         expect(related).toHaveLength(TOOLS.length - 1)
         expect(related.map((entry) => entry.slug)).not.toContain(tool.slug)
      }
   })

   it("returns everything for an unknown slug", () => {
      expect(relatedTools("not-a-tool")).toHaveLength(TOOLS.length)
   })
})
