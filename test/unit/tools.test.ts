import { describe, expect, it } from "vitest"
// Relative, not aliased: `~` is a Nuxt convenience that exists only inside
// the Nuxt/Vite environment, and these tests run in plain Node.
import { COPY, SEO } from "../../app/utils/copy"
import {
   GROUP_ROUTES,
   groupSectionId,
   hubGroups,
   hubPath,
   isHubGroup,
   occupiedGroups,
   relatedTools,
   TOOL_GROUPS,
   TOOLS,
   toolsByGroup,
} from "../../app/utils/tools"
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
   ///
   /// Seven, raised from six on purpose rather than to let a route through:
   /// the decibel meter fits none of the existing groups, and `"audio"`
   /// was chosen over folding BMI into `"calculators"` to make room, which
   /// would have moved a shipped tool's nav label. The cost is recorded in
   /// docs/roadmap.md — the eighth group has to displace one, not add one.
   it("labels every group, and keeps the top level short", () => {
      const TOP_LEVEL_BUDGET = 7

      for (const group of TOOL_GROUPS) {
         expect(COPY.nav.groups[group], `${group} has no nav label`).toBeDefined()
         expect(COPY.nav.groups[group].trim()).not.toBe("")
      }

      expect(occupiedGroups().length, "the header nav has outgrown one row").toBeLessThanOrEqual(
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

   /// The home page renders one section per occupied group, each with a
   /// heading and a line of prose from `COPY.groups`. A group added to the
   /// registry without that block renders a section with two empty
   /// paragraphs in it — visible only by loading the page, which is what
   /// this catches instead.
   it("gives every group a heading and a lede", () => {
      for (const group of TOOL_GROUPS) {
         const copy = COPY.groups[group]

         expect(copy, `${group} has no group copy`).toBeDefined()
         expect(copy.heading.trim(), `${group} has an empty heading`).not.toBe("")
         expect(copy.lede.trim(), `${group} has an empty lede`).not.toBe("")
      }
   })

   /// The mirror of the orphaned-copy-block check above. Copy for a group
   /// the registry dropped is copy nothing renders.
   it("leaves no group copy orphaned by the registry", () => {
      for (const group of Object.keys(COPY.groups)) {
         expect(TOOL_GROUPS).toContain(group)
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

describe("occupiedGroups", () => {
   it("returns groups in registry order", () => {
      const occupied = occupiedGroups()

      expect(occupied).toEqual(TOOL_GROUPS.filter((group) => occupied.includes(group)))
   })

   it("omits any group holding no tools", () => {
      for (const group of occupiedGroups()) {
         expect(toolsByGroup(group).length, `${group} is listed but empty`).toBeGreaterThan(0)
      }
   })

   /// The home page renders a section per occupied group and nothing else,
   /// so anything this drops is a tool with no route to it from the home
   /// page at all.
   it("accounts for every tool between them", () => {
      const listed = occupiedGroups().flatMap((group) => toolsByGroup(group))

      expect(listed).toHaveLength(TOOLS.length)
   })
})

/// Hub pages are pages but not tools, so the registry guards above do not
/// reach them. These are the equivalent, added deliberately rather than by
/// relaxing an assertion until the new routes slipped through it.

describe("hub pages", () => {
   it("names a real group in every hub route", () => {
      for (const group of Object.keys(GROUP_ROUTES)) {
         expect(TOOL_GROUPS).toContain(group)
      }
   })

   it("uses lowercase kebab-case route segments", () => {
      for (const route of Object.values(GROUP_ROUTES)) {
         expect(route).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
      }
   })

   it("never collides a hub route with a tool route", () => {
      const toolPaths = new Set(TOOLS.map((tool) => tool.path))

      for (const group of hubGroups()) {
         expect(toolPaths.has(hubPath(group)), `${group} shadows a tool route`).toBe(false)
      }
   })

   /// The reason `GROUP_ROUTES` is `Partial`: a hub over a single card is
   /// a page duplicating the one tool it links to. If this fails, either a
   /// group shrank or a hub was added too early.
   it("gives a hub only to a group holding two or more tools", () => {
      for (const group of hubGroups()) {
         expect(toolsByGroup(group).length, `${group} is too small for a hub`)
            .toBeGreaterThanOrEqual(2)
      }
   })

   it("gives every hub group search metadata and copy", () => {
      for (const group of hubGroups()) {
         expect(SEO[`${group}Hub`], `${group} hub has no SEO entry`).toBeDefined()
         expect(COPY.groups[group].plural.trim(), `${group} has no plural`).not.toBe("")
      }
   })

   /// Every group gets a plural, not only the four with hubs: a group
   /// becomes a hub by being added to `GROUP_ROUTES` alone, and finding
   /// out then that its link text is empty is finding out too late.
   it("gives every group a plural for its link text", () => {
      for (const group of TOOL_GROUPS) {
         expect(COPY.groups[group].plural.trim(), `${group} has no plural`).not.toBe("")
      }
   })

   it("marks exactly the routed groups as hub groups", () => {
      for (const group of TOOL_GROUPS) {
         expect(isHubGroup(group)).toBe(group in GROUP_ROUTES)
      }
   })
})

describe("groupSectionId", () => {
   /// The chip row's `href` and the section's `id` are built from this on
   /// opposite sides of the page, so a change here has to stay a valid
   /// fragment or the anchors quietly stop working.
   it("produces a unique, valid fragment per group", () => {
      const ids = TOOL_GROUPS.map(groupSectionId)

      expect(new Set(ids).size).toBe(ids.length)

      for (const id of ids) {
         expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
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
