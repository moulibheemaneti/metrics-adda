import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import SiteFooter from "../../app/components/SiteFooter.vue"

/// Smoke test for the app shell, run inside the real Nuxt environment so
/// auto-imports (`COPY`, `SITE_EMAIL`) resolve exactly as they do at
/// runtime — a broken auto-import fails here rather than in production.

describe("SiteFooter", () => {
   /// AdSense approval depends on the policy, the about page and the
   /// contact page being reachable from every page, and the footer is the
   /// only thing on every page that links them. Google's pre-review
   /// checklist asks for all three by name, so losing a link here is an
   /// approval risk rather than a cosmetic regression.
   it.each([
      ["/about"],
      ["/contact"],
      ["/privacy-policy"],
   ])("links %s", async(href) => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.find(`a[href="${href}"]`).exists()).toBe(true)
   })

   it("renders the current year in the copyright line", async() => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.text()).toContain(String(new Date().getFullYear()))
   })
})
