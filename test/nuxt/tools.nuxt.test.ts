import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import BmiCalculatorPanel from "../../app/components/BmiCalculatorPanel.vue"
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

/// The BMI panel had no component test before advanced mode was added.
/// The basic-mode block is the guard on "basic is the tool that already
/// existed" — it has to keep passing whatever advanced grows into.
describe("BmiCalculatorPanel", () => {
   /// Radios in DOM order: mode (basic, advanced), then units (metric,
   /// imperial), then sex once the advanced panel is on screen.
   const MODE_ADVANCED = 1
   const SYSTEM_IMPERIAL = 3
   const SEX_FEMALE = 4
   const SEX_MALE = 5

   /// Text fields in DOM order: height, weight, then age and the three
   /// tape measurements from the child panel.
   const AGE = 2
   const WAIST = 3
   const NECK = 4
   const HIP = 5

   type Panel = Awaited<ReturnType<typeof mountSuspended<typeof BmiCalculatorPanel>>>

   /// Mounted and switched to advanced, which every case below starts from.
   const advanced = async(): Promise<Panel> => {
      const panel = await mountSuspended(BmiCalculatorPanel)

      await panel.findAll("input[type=\"radio\"]")[MODE_ADVANCED]?.setValue()

      return panel
   }

   describe("basic mode", () => {
      it("renders a worked example before any interaction", async() => {
         const panel = await mountSuspended(BmiCalculatorPanel)

         expect(panel.find(".bmi__value").text()).toBe("22.9")
         expect(panel.find(".bmi__category").text()).toBe(COPY.bmi.categories.normal)
         expect(panel.find(".bmi__marker").attributes("style")).toContain("inset-inline-start")
      })

      /// Flipping the unit system reinterprets the digits already in the
      /// fields rather than converting them — long-standing behaviour of
      /// this panel, and not something advanced mode changed. So the
      /// assertion worth making is that the imperial *path* agrees: the
      /// same body entered in pounds and feet reads the same BMI.
      it("agrees between the two unit systems", async() => {
         const panel = await mountSuspended(BmiCalculatorPanel)

         await panel.findAll("input[type=\"radio\"]")[SYSTEM_IMPERIAL]?.setValue()

         const fields = panel.findAll("input[type=\"text\"]")

         // 5 ft 9 in and 154.324 lb — 1.7526 m and 70 kg.
         await fields[2]?.setValue("154.324")

         expect(panel.find(".bmi__value").text()).toBe("22.8")
         expect(panel.find(".bmi__category").text()).toBe(COPY.bmi.categories.normal)
      })

      it("prompts instead of calculating when a field is empty", async() => {
         const panel = await mountSuspended(BmiCalculatorPanel)

         await panel.findAll("input[type=\"text\"]")[1]?.setValue("")

         expect(panel.find(".bmi__empty").text()).toBe(COPY.bmi.empty)
         expect(panel.find(".bmi__value").exists()).toBe(false)
      })

      it("shows no advanced surface at all", async() => {
         const panel = await mountSuspended(BmiCalculatorPanel)

         expect(panel.find(".body").exists()).toBe(false)
         expect(panel.findAll("select")).toHaveLength(0)
      })
   })

   describe("advanced mode", () => {
      it("reveals the population selector and the composition panel", async() => {
         const panel = await advanced()

         expect(panel.find(".body").exists()).toBe(true)
         expect(panel.findAll("select").length).toBeGreaterThan(0)
      })

      /// Sex has no neutral default, so it is deliberately unset — which
      /// means the panel has to explain the gap rather than look broken.
      it("asks for a sex before estimating anything", async() => {
         const panel = await advanced()

         expect(panel.text()).toContain(COPY.body.sexPrompt)
         expect(panel.text()).not.toContain(COPY.body.compositionHeading)
      })

      it("estimates body fat once the tape measurements are in", async() => {
         const panel = await advanced()

         await panel.findAll("input[type=\"radio\"]")[SEX_MALE]?.setValue()

         const fields = panel.findAll("input[type=\"text\"]")

         expect(panel.text()).toContain(COPY.body.needsWaistNeck)

         await fields[WAIST]?.setValue("85")
         await fields[NECK]?.setValue("38")

         // 175 cm, 85 cm waist, 38 cm neck — the fixture from body.test.ts.
         expect(panel.text()).toContain("16.9%")
         expect(panel.text()).not.toContain(COPY.body.needsWaistNeck)
      })

      /// The guard that matters most: waist === neck returns exactly -450
      /// from the raw formula, so this is the case that would otherwise
      /// render a large negative percentage.
      it("explains a waist that is not larger than the neck", async() => {
         const panel = await advanced()

         await panel.findAll("input[type=\"radio\"]")[SEX_MALE]?.setValue()

         const fields = panel.findAll("input[type=\"text\"]")

         await fields[WAIST]?.setValue("38")
         await fields[NECK]?.setValue("38")

         expect(panel.find(".notice").text()).toBe(COPY.body.waistUnderNeck)
         expect(panel.text()).not.toContain("-450")
      })

      it("asks for a hip measurement on the female form", async() => {
         const panel = await advanced()

         await panel.findAll("input[type=\"radio\"]")[SEX_FEMALE]?.setValue()

         const fields = panel.findAll("input[type=\"text\"]")

         await fields[WAIST]?.setValue("76")
         await fields[NECK]?.setValue("32")

         expect(panel.text()).toContain(COPY.body.needsHip)

         await fields[HIP]?.setValue("98")

         // The panel's seeded 175 cm height, not the 165 cm fixture in
         // test/unit/body.test.ts — the component supplies its own.
         expect(panel.text()).toContain("26.8%")
      })

      /// The whole point of the selector: the reading never moves, the
      /// label does — and it moves in the main readout, not just below.
      it("relabels the same reading under another population", async() => {
         const panel = await advanced()

         await panel.findAll("input[type=\"text\"]")[1]?.setValue("73.5")

         expect(panel.find(".bmi__value").text()).toBe("24")
         expect(panel.find(".bmi__category").text()).toBe(COPY.bmi.categories.normal)

         await panel.findAll("select")[0]?.setValue("india")

         expect(panel.find(".bmi__value").text()).toBe("24")
         expect(panel.find(".bmi__category").text()).toBe(COPY.bmi.categories.overweight)
         expect(panel.text()).toContain(COPY.body.populations.india)
      })

      it("refuses to estimate for a child", async() => {
         const panel = await advanced()

         await panel.findAll("input[type=\"radio\"]")[SEX_MALE]?.setValue()
         await panel.findAll("input[type=\"text\"]")[AGE]?.setValue("12")

         expect(panel.find(".notice").text()).toBe(COPY.body.adultsOnly)
      })

      it("measures circumferences in inches under imperial units", async() => {
         const panel = await advanced()

         await panel.findAll("input[type=\"radio\"]")[SEX_MALE]?.setValue()
         await panel.findAll("input[type=\"radio\"]")[SYSTEM_IMPERIAL]?.setValue()

         expect(panel.text()).toContain(`${COPY.body.waistLabel} (${COPY.bmi.inches})`)

         // Imperial height is two fields, so everything after it shifts by one.
         const fields = panel.findAll("input[type=\"text\"]")

         await fields[AGE + 1]?.setValue("30")
         await fields[WAIST + 1]?.setValue("33.464567")
         await fields[NECK + 1]?.setValue("14.960630")

         // 85 cm and 38 cm in inches — the same reading as the metric case.
         expect(panel.text()).toContain("16.9%")
      })

      /// Radios are labelled by their wrapping <label>, so only the
      /// controls that need an explicit id/for pair are checked here.
      it("labels every control", async() => {
         const panel = await advanced()

         const controls = [
            ...panel.findAll("input[type=\"text\"]"),
            ...panel.findAll("select"),
         ]

         for (const control of controls) {
            const id = control.attributes("id")

            expect(id, "control has no id to label").toBeTruthy()
            expect(panel.find(`label[for="${id}"]`).exists(), `no label for ${id}`).toBe(true)
         }
      })
   })
})

describe("ToolNav", () => {
   /// Sorted rather than compared in order: the nav lists tools by group
   /// now, so its order is the registry's grouped order, not its raw one.
   /// What has to hold is that nothing is dropped — these are the site's
   /// internal links, and a tool missing from the nav is a tool that loses
   /// twelve inbound links.
   it("links to every registered tool", async() => {
      const nav = await mountSuspended(ToolNav)
      const hrefs = nav.findAll("a").map((link) => link.attributes("href"))

      expect(hrefs.toSorted()).toEqual(TOOLS.map((tool) => tool.path).toSorted())
   })

   /// The panels are hidden with CSS, not mounted on click. Rendering them
   /// only when opened would take every link out of the server-rendered
   /// HTML, which is the one thing this nav cannot afford to do.
   it("renders the collapsed panels rather than mounting them on demand", async() => {
      const nav = await mountSuspended(ToolNav)

      expect(nav.findAll(".tool-nav__panel").length).toBeGreaterThan(0)

      // Asserted on the inline style `v-show` writes, not `isVisible()`,
      // which reports true here even with `display: none` on the element.
      for (const panel of nav.findAll(".tool-nav__panel")) {
         expect(panel.attributes("style")).toContain("display: none")
      }
   })

   it("opens a group and marks it expanded", async() => {
      const nav = await mountSuspended(ToolNav)
      const trigger = nav.findAll(".tool-nav__trigger")[0]

      expect(trigger?.attributes("aria-expanded")).toBe("false")

      await trigger?.trigger("click")

      expect(trigger?.attributes("aria-expanded")).toBe("true")
      expect(nav.find(".tool-nav__panel").attributes("style") ?? "").not.toContain("display: none")

      // Clicking the same trigger again collapses it.
      await trigger?.trigger("click")

      expect(trigger?.attributes("aria-expanded")).toBe("false")
   })

   /// A category button controls a panel, so the two have to be wired
   /// together by id or a screen reader is told a list exists but not
   /// which one.
   it("points every trigger at the panel it controls", async() => {
      const nav = await mountSuspended(ToolNav)

      for (const trigger of nav.findAll(".tool-nav__trigger")) {
         const id = trigger.attributes("aria-controls")

         expect(id, "trigger controls nothing").toBeTruthy()
         expect(nav.find(`#${id}`).exists(), `no panel with id ${id}`).toBe(true)
      }
   })

   /// A group of one is a link to that tool, not a dropdown wrapping a
   /// single item. Both shapes are live in the registry today.
   it("renders a single-tool group as a direct link", async() => {
      const nav = await mountSuspended(ToolNav)
      const singles = TOOL_GROUPS
         .map((group) => toolsByGroup(group))
         .filter((tools) => tools.length === 1)

      expect(singles.length).toBeGreaterThan(0)

      for (const [tool] of singles) {
         const link = nav.find(`.tool-nav__list > li > a[href="${tool?.path}"]`)

         expect(link.exists(), `${tool?.slug} is not a top-level link`).toBe(true)
      }
   })
})
