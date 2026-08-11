import type { DOMWrapper, VueWrapper } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import TextStatsPanel from "../../app/components/TextStatsPanel.vue"

/// The speed settings have one thing that can quietly rot: "recommended"
/// is the *absence* of both stored keys, not a stored 238 and 150. Storing
/// the figures would pin a visitor to today's recommendation forever, and
/// the difference is invisible in the UI — so it is what these tests watch
/// most closely, alongside the draft that Save commits and Cancel throws
/// away.

const reset = (): void => {
   localStorage.removeItem("ma-reading-speed")
   localStorage.removeItem("ma-speaking-speed")
}

afterEach(reset)

/// The "(300 wpm)" part is its own block-level span inside the label, so the
/// markup carries a newline and indentation between the two. `text()` trims
/// the ends but leaves that gap alone, so it is collapsed here — these
/// assertions are about the wording, not about how the tile breaks the line.
const labels = (panel: VueWrapper): string[] =>
   panel.findAll(".stat__label").map((stat) => stat.text().replace(/\s+/gu, " "))

const values = (panel: VueWrapper): string[] =>
   panel.findAll(".stat__value").map((stat) => stat.text())

const isLocked = (slider: DOMWrapper<Element>): boolean => "disabled" in slider.attributes()

/** Open the settings and untick "use the recommended speeds". */
const openCustom = async(panel: VueWrapper): Promise<DOMWrapper<Element>[]> => {
   await panel.find(".text-stats__settings-trigger").trigger("click")
   await panel.find("input[type=\"checkbox\"]").setValue(false)

   return panel.findAll("input[type=\"range\"]")
}

describe("TextStatsPanel — speed settings", () => {
   it("labels the timings plainly while the recommended speeds are in use", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      expect(labels(panel)).toContain("Reading time")
      expect(labels(panel)).toContain("Speaking time")
      expect(labels(panel).join(" ")).not.toContain("wpm")
   })

   it("adopts a speed stored before it mounted", async() => {
      localStorage.setItem("ma-reading-speed", "300")

      const panel = await mountSuspended(TextStatsPanel)

      expect(labels(panel)).toContain("Reading time (300 wpm)")
      // Only the one that was stored — the other stays recommended.
      expect(labels(panel)).toContain("Speaking time")
   })

   it("shortens the estimate when the reading speed goes up", async() => {
      localStorage.setItem("ma-reading-speed", "476")

      const panel = await mountSuspended(TextStatsPanel)

      await panel.find("textarea").setValue("one two three four five six seven eight")

      // Eight words at twice 238 wpm is half the time 238 would give.
      expect(values(panel)[6]).toBe("1s")
   })

   it("falls back to the recommended speed when the stored value is junk", async() => {
      localStorage.setItem("ma-reading-speed", "fast")

      const panel = await mountSuspended(TextStatsPanel)

      expect(labels(panel)).toContain("Reading time")
   })

   it("discards a stored speed from outside the slider's range", async() => {
      localStorage.setItem("ma-reading-speed", "5000")

      const panel = await mountSuspended(TextStatsPanel)

      // Clamping to 800 would have hidden a bad write behind a plausible
      // number; falling back makes it obvious the value was not honoured.
      expect(labels(panel)).toContain("Reading time")
   })

   it("stays collapsed until the gear is pressed", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      expect(panel.find(".text-stats__settings").exists()).toBe(false)
      expect(panel.find(".text-stats__settings-trigger").attributes("aria-expanded")).toBe("false")

      await panel.find(".text-stats__settings-trigger").trigger("click")

      expect(panel.find(".text-stats__settings").exists()).toBe(true)
      expect(panel.find(".text-stats__settings-trigger").attributes("aria-expanded")).toBe("true")
   })

   it("collapses again when the gear is pressed a second time", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      await panel.find(".text-stats__settings-trigger").trigger("click")
      await panel.find(".text-stats__settings-trigger").trigger("click")

      expect(panel.find(".text-stats__settings").exists()).toBe(false)
   })

   it("opens with the box ticked and both sliders locked", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      await panel.find(".text-stats__settings-trigger").trigger("click")

      const box = panel.find("input[type=\"checkbox\"]").element as HTMLInputElement
      const sliders = panel.findAll("input[type=\"range\"]")

      expect(box.checked).toBe(true)
      expect(sliders).toHaveLength(2)
      expect(sliders.every(isLocked)).toBe(true)
   })

   it("unlocks the sliders when the box is unticked", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      expect(sliders.every(isLocked)).toBe(false)
   })

   it("moves the estimate as the slider moves, before anything is saved", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      await panel.find("textarea").setValue("one two three four five six seven eight")

      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("476")

      // Live preview is the reason this is an inline panel rather than a
      // dialog, so it is worth pinning: the tile updates on drag, and the
      // stored value has not been touched.
      expect(values(panel)[6]).toBe("1s")
      expect(labels(panel)).toContain("Reading time (476 wpm)")
      expect(localStorage.getItem("ma-reading-speed")).toBeNull()
   })

   it("quietens the live region while the settings are open", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      expect(panel.find(".text-stats__grid").attributes("aria-live")).toBe("polite")

      await panel.find(".text-stats__settings-trigger").trigger("click")

      // A slider announces its own value on every step; eight tiles
      // talking over that would bury it.
      expect(panel.find(".text-stats__grid").attributes("aria-live")).toBe("off")
   })

   it("saves a custom speed and stores it", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("300")
      await panel.find(".text-stats__settings").trigger("submit")

      expect(localStorage.getItem("ma-reading-speed")).toBe("300")
      expect(labels(panel)).toContain("Reading time (300 wpm)")
      expect(panel.find(".text-stats__settings").exists()).toBe(false)
   })

   it("announces the saved estimates, which the grid no longer can", async() => {
      const panel = await mountSuspended(TextStatsPanel)

      await panel.find("textarea").setValue("one two three four five six seven eight")

      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("476")
      await panel.find(".text-stats__settings").trigger("submit")

      expect(panel.find(".visually-hidden").text()).toContain("Reading time: 1 second")
   })

   it("leaves the committed speeds alone when Cancel is pressed", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("300")
      await panel.findAll(".text-stats__settings-actions .button")[0]?.trigger("click")

      expect(localStorage.getItem("ma-reading-speed")).toBeNull()
      expect(labels(panel)).toContain("Reading time")
      expect(panel.find(".text-stats__settings").exists()).toBe(false)
   })

   it("reverts a draft on Escape", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("300")
      await panel.find(".text-stats__settings").trigger("keydown.esc")

      expect(localStorage.getItem("ma-reading-speed")).toBeNull()
      expect(labels(panel)).toContain("Reading time")
      expect(panel.find(".text-stats__settings").exists()).toBe(false)
   })

   it("reseeds the sliders from the committed speeds on every open", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("300")
      await panel.findAll(".text-stats__settings-actions .button")[0]?.trigger("click")
      await panel.find(".text-stats__settings-trigger").trigger("click")

      const box = panel.find("input[type=\"checkbox\"]").element as HTMLInputElement

      expect(box.checked).toBe(true)
   })

   it("hands a custom value back when the box is unticked again", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("300")
      await panel.find("input[type=\"checkbox\"]").setValue(true)
      await panel.find("input[type=\"checkbox\"]").setValue(false)

      // Within one opening the dragged value survives a round trip through
      // the checkbox, so re-ticking is not a way to lose it by accident.
      expect((sliders[0]?.element as HTMLInputElement).value).toBe("300")
   })

   it("stores the recommended speeds as the absence of a key", async() => {
      const panel = await mountSuspended(TextStatsPanel)
      const sliders = await openCustom(panel)

      await sliders[0]?.setValue("300")
      await panel.find(".text-stats__settings").trigger("submit")

      await panel.find(".text-stats__settings-trigger").trigger("click")
      await panel.find("input[type=\"checkbox\"]").setValue(true)
      await panel.find(".text-stats__settings").trigger("submit")

      // Not "238" / "150": storing the figures would pin the visitor to
      // today's recommendation rather than letting them inherit a later one.
      expect(localStorage.getItem("ma-reading-speed")).toBeNull()
      expect(localStorage.getItem("ma-speaking-speed")).toBeNull()
      expect(labels(panel)).toContain("Reading time")
   })
})
