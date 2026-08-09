import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import HeightConverter from "../../app/components/HeightConverter.vue"
import PasswordGeneratorPanel from "../../app/components/PasswordGeneratorPanel.vue"
import TextStatsPanel from "../../app/components/TextStatsPanel.vue"
import ToolNav from "../../app/components/ToolNav.vue"
import UnitConverter from "../../app/components/UnitConverter.vue"

/// Mounted in the real Nuxt environment so auto-imports resolve exactly as
/// they do at runtime. These cover the wiring between the pure functions
/// in utils/ and the DOM — the maths itself is tested in test/unit.

describe("UnitConverter", () => {
   it("converts on first render, before any interaction", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "mass", from: "kg", to: "lb" },
      })
      const inputs = converter.findAll("input")

      expect(inputs[0]?.element.value).toBe("1")
      expect(inputs[1]?.element.value).toBe("2.2046226")
   })

   it("reconverts when the source value changes", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "mass", from: "kg", to: "lb" },
      })
      const inputs = converter.findAll("input")

      await inputs[0]?.setValue("2")

      expect(inputs[1]?.element.value).toBe("4.4092452")
   })

   it("converts backwards when the result field is edited", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "temperature", from: "c", to: "f" },
      })
      const inputs = converter.findAll("input")

      await inputs[1]?.setValue("212")

      expect(inputs[0]?.element.value).toBe("100")
   })

   it("clears the other field when the input is emptied", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "mass", from: "kg", to: "lb" },
      })
      const inputs = converter.findAll("input")

      await inputs[0]?.setValue("")

      expect(inputs[1]?.element.value).toBe("")
   })

   it("reports text that is not a number", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "mass", from: "kg", to: "lb" },
      })

      expect(converter.find(".field__error").exists()).toBe(false)

      await converter.findAll("input")[0]?.setValue("abc")

      expect(converter.find(".field__error").exists()).toBe(true)
   })

   it("swaps units and values together", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "mass", from: "kg", to: "lb" },
      })
      const selects = converter.findAll("select")

      await converter.find("button").trigger("click")

      expect(selects[0]?.element.value).toBe("lb")
      expect(selects[1]?.element.value).toBe("kg")
   })

   it("renders a row for every unit in the dimension", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "length", from: "cm", to: "in" },
      })

      expect(converter.findAll("tbody tr")).toHaveLength(DIMENSIONS.length.units.length)
   })

   it("labels every control", async() => {
      const converter = await mountSuspended(UnitConverter, {
         props: { dimension: "mass", from: "kg", to: "lb" },
      })

      for (const control of [...converter.findAll("input"), ...converter.findAll("select")]) {
         const id = control.attributes("id")

         expect(id, "control has no id to label").toBeTruthy()
         expect(converter.find(`label[for="${id}"]`).exists(), `no label for ${id}`).toBe(true)
      }
   })
})

describe("HeightConverter", () => {
   it("splits centimetres into feet and inches on first render", async() => {
      const converter = await mountSuspended(HeightConverter)
      const inputs = converter.findAll("input")

      expect(inputs[0]?.element.value).toBe("180")
      expect(inputs[1]?.element.value).toBe("5")
      expect(Number(inputs[2]?.element.value)).toBeCloseTo(10.9, 1)
   })

   it("converts feet and inches back to centimetres", async() => {
      const converter = await mountSuspended(HeightConverter)
      const inputs = converter.findAll("input")

      await inputs[1]?.setValue("5")
      await inputs[2]?.setValue("11")

      expect(inputs[0]?.element.value).toBe("180.34")
   })
})

describe("TextStatsPanel", () => {
   it("counts as the text is typed", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      await panel.find("textarea").setValue("the quick brown fox")

      const values = panel.findAll(".stat__value").map((stat) => stat.text())

      // Words, characters, characters without spaces.
      expect(values[0]).toBe("4")
      expect(values[1]).toBe("19")
      expect(values[2]).toBe("16")
   })

   it("starts at zero", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      expect(panel.find(".stat__value").text()).toBe("0")
   })
})

describe("PasswordGeneratorPanel", () => {
   it("generates a password once mounted", async() => {
      const panel = await mountSuspended(PasswordGeneratorPanel)
      const output = panel.find("input").element

      expect(output.value).toHaveLength(16)
   })

   it("generates a different password on request", async() => {
      const panel = await mountSuspended(PasswordGeneratorPanel)
      const output = panel.find("input").element
      const first = output.value

      // Not just any button — CopyButton comes first in the DOM.
      await panel.find(".button--primary").trigger("click")

      expect(output.value).not.toBe(first)
   })

   it("reports an error instead of crashing when every set is off", async() => {
      const panel = await mountSuspended(PasswordGeneratorPanel)

      for (const checkbox of panel.findAll("input[type=\"checkbox\"]").slice(0, 4)) {
         await checkbox.setValue(false)
      }

      expect(panel.find(".notice").exists()).toBe(true)
      expect(panel.find("input").element.value).toBe("")
   })
})

describe("ToolNav", () => {
   it("links to every registered tool", async() => {
      const nav = await mountSuspended(ToolNav)
      const hrefs = nav.findAll("a").map((link) => link.attributes("href"))

      expect(hrefs).toEqual(TOOLS.map((tool) => tool.path))
   })
})
