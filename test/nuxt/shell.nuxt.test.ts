import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import SiteFooter from "../../app/components/SiteFooter.vue"

/// Smoke test for the app shell, run inside the real Nuxt environment so
/// auto-imports (`useI18n`, `SITE_EMAIL`) resolve exactly as they do at
/// runtime — a broken auto-import fails here rather than in production.

describe("SiteFooter", () => {
   it("renders the contact address as a mailto link", async() => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.find("a").attributes("href")).toBe(`mailto:${SITE_EMAIL}`)
   })

   it("renders the current year in the copyright line", async() => {
      const footer = await mountSuspended(SiteFooter)

      expect(footer.text()).toContain(String(new Date().getFullYear()))
   })
})
