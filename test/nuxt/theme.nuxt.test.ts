import { afterEach, describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import ThemeToggle from "../../app/components/ThemeToggle.vue"

/// The theme has three states but only two attribute values: "system" is
/// the *absence* of `data-theme`, which is what lets the
/// prefers-color-scheme media query decide. Most of what can break here is
/// that distinction, so it is what these tests pin down.

const reset = (): void => {
   localStorage.removeItem("ma-theme")
   document.documentElement.removeAttribute("data-theme")
}

afterEach(reset)

describe("ThemeToggle", () => {
   it("offers exactly system, light and dark", async() => {
      const toggle = await mountSuspended(ThemeToggle)
      const values = toggle.findAll("input[type=\"radio\"]").map((input) => input.attributes("value"))

      expect(values).toEqual(["system", "light", "dark"])
   })

   it("defaults to system with no stored preference", async() => {
      const toggle = await mountSuspended(ThemeToggle)

      expect(toggle.find(".theme-toggle__option--active").text()).toContain("System")
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false)
   })

   it("writes the attribute when dark is chosen", async() => {
      const toggle = await mountSuspended(ThemeToggle)

      await toggle.findAll("input[type=\"radio\"]")[2]?.trigger("change")

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark")
      expect(localStorage.getItem("ma-theme")).toBe("dark")
   })

   it("writes the attribute when light is chosen, overriding a dark OS", async() => {
      const toggle = await mountSuspended(ThemeToggle)

      await toggle.findAll("input[type=\"radio\"]")[1]?.trigger("change")

      // The explicit value matters: `themes/_dark.scss` guards its media
      // query with :not([data-theme="light"]), so this is what lets a light
      // choice win on a dark-set machine.
      expect(document.documentElement.getAttribute("data-theme")).toBe("light")
   })

   it("removes the attribute and the stored key when returning to system", async() => {
      const toggle = await mountSuspended(ThemeToggle)
      const radios = toggle.findAll("input[type=\"radio\"]")

      await radios[2]?.trigger("change")
      await radios[0]?.trigger("change")

      // Absence, not "system": anything else would pin the visitor to a
      // value and stop the OS setting being honoured.
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false)
      expect(localStorage.getItem("ma-theme")).toBeNull()
   })

   it("adopts a preference stored before it mounted", async() => {
      localStorage.setItem("ma-theme", "dark")

      const toggle = await mountSuspended(ThemeToggle)

      expect(toggle.find(".theme-toggle__option--active").text()).toContain("Dark")
   })

   it("falls back to system when the stored value is junk", async() => {
      localStorage.setItem("ma-theme", "solarised")

      const toggle = await mountSuspended(ThemeToggle)

      expect(toggle.find(".theme-toggle__option--active").text()).toContain("System")
   })

   it("labels the group for screen readers", async() => {
      const toggle = await mountSuspended(ThemeToggle)

      expect(toggle.find("legend").text()).toBe("Colour theme")
      expect(toggle.findAll("input[type=\"radio\"]")).toHaveLength(3)
   })
})
