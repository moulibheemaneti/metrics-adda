import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { COPY, SEO } from "../../app/utils/copy"
import { relatedTools, TOOL_GROUPS, TOOLS, toolsByGroup } from "../../app/utils/tools"
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

   /// Digits are allowed inside a segment but not at the start of one:
   /// `base64-encoder` is a slug, and the hash generator will want
   /// `sha256` in one too. The pattern still rejects what it was written
   /// to reject — capitals, underscores, spaces, and a leading, trailing
   /// or doubled hyphen — so widening it here keeps the guard rather than
   /// relaxing it around one awkward route.
   it("uses lowercase kebab-case slugs", () => {
      for (const tool of TOOLS) {
         expect(tool.slug).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
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

   /// The header nav's top level is one item per non-empty group, so its
   /// width is bounded by the number of groups rather than by the number
   /// of tools. That is the whole point of the change — the previous flat
   /// row came to 1940px of links and overflowed at every viewport width,
   /// including 1920px. This is the assertion that keeps the bound real.
   it("labels every group, and keeps the top level short", () => {
      const TOP_LEVEL_BUDGET = 6

      for (const group of TOOL_GROUPS) {
         expect(COPY.nav.groups[group], `${group} has no nav label`).toBeDefined()
         expect(COPY.nav.groups[group].trim()).not.toBe("")
      }

      const occupied = TOOL_GROUPS.filter((group) => toolsByGroup(group).length > 0)

      expect(occupied.length, "the header nav has outgrown one row").toBeLessThanOrEqual(
         TOP_LEVEL_BUDGET,
      )
   })

   /// A group holding one tool renders as a direct link to it; the label
   /// only appears once the group has two. Both paths have to be reachable
   /// from the registry, or one of them is dead code nobody notices.
   it("has both a single-tool group and a multi-tool group", () => {
      const sizes = TOOL_GROUPS.map((group) => toolsByGroup(group).length).filter(Boolean)

      expect(sizes).toContain(1)
      expect(sizes.some((size) => size > 1)).toBe(true)
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

   /// Derived from TOOL_GROUPS rather than a hand-written list, so adding
   /// a group cannot quietly leave its tools uncounted here.
   it("accounts for every tool across all groups", () => {
      const grouped = TOOL_GROUPS.flatMap((group) => toolsByGroup(group))

      expect(grouped).toHaveLength(TOOLS.length)
   })

   it("puts every tool in a known group", () => {
      for (const tool of TOOLS) {
         expect(TOOL_GROUPS).toContain(tool.group)
      }
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
