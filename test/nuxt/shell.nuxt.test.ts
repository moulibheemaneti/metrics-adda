import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import SiteFooter from "../../app/components/SiteFooter.vue"

/// Smoke test for the app shell, run inside the real Nuxt environment so
/// auto-imports (`COPY`, `SITE_EMAIL`) resolve exactly as they do at
/// runtime — a broken auto-import fails here rather than in production.

describe("SiteFooter", () => {
   it("renders the contact address as a mailto link", async() => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.find("a[href^=\"mailto:\"]").attributes("href")).toBe(`mailto:${SITE_EMAIL}`)
   })

   /// AdSense approval depends on the policy being reachable from every
   /// page, and the footer is the only thing on every page that links it.
   it("links the privacy policy", async() => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.find("a[href=\"/privacy-policy\"]").exists()).toBe(true)
   })

   it("renders the current year in the copyright line", async() => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.text()).toContain(String(new Date().getFullYear()))
   })
})
