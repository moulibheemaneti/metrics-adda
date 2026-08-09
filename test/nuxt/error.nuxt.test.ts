import { describe, expect, it } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import type { VueWrapper } from "@vue/test-utils"
import { createError } from "#app"
import ErrorPage from "../../app/error.vue"

/// Nuxt's built-in error page carries its own branding and interpolates the
/// requested path into the <title>. Both are replaced here, so these tests
/// pin the replacement down rather than the framework default creeping back.

/// Built with `createError` rather than an object literal so the prop is a
/// real NuxtError — the shape the page actually receives at runtime.
const mount = (statusCode: number): Promise<VueWrapper> =>
   mountSuspended(ErrorPage, {
      props: {
         error: createError({
            statusCode,
            message: "Page not found: /does-not-exist",
         }),
      },
   })

describe("error page", () => {
   it("shows the not-found copy for a 404", async() => {
      const page = await mount(404)

      expect(page.find(".error-page__code").text()).toBe("404")
      expect(page.find("h1").text()).toBe("That page doesn't exist")
   })

   it("shows the failure copy for a 500", async() => {
      const page = await mount(500)

      expect(page.find(".error-page__code").text()).toBe("500")
      expect(page.find("h1").text()).toBe("Something went wrong")
   })

   /// The whole reason for a custom page: a 404 that dead-ends wastes the
   /// visit, and every tool page depends on the internal link graph.
   it("links to every tool so the page is not a dead end", async() => {
      const page = await mount(404)
      const hrefs = page.findAll("a").map((link) => link.attributes("href"))

      for (const tool of TOOLS) {
         expect(hrefs, `no link to ${tool.slug}`).toContain(tool.path)
      }
   })

   it("keeps the requested path out of the page", async() => {
      const page = await mount(404)

      // Nuxt's default renders "Page not found: /does-not-exist" — anything
      // from the URL reaching the markup is arbitrary text on our page.
      expect(page.text()).not.toContain("does-not-exist")
   })

   it("offers a route home", async() => {
      const page = await mount(404)

      expect(page.find(".error-page__home").text()).toBe("Back to all tools")
   })
})
