import { afterEach, describe, expect, it, vi } from "vitest"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import InstallButton from "../../app/components/InstallButton.vue"
import { useInstallPrompt } from "../../app/composables/useInstallPrompt"

/// The install button is defined as much by when it is *absent* as by what
/// it does: it must not render on a browser that never offers an install
/// (Safari, Firefox — the majority of the traffic that cannot act on it),
/// and it must take itself away once the app is installed. Those are the
/// cases these tests pin down.

/// A stand-in for the Chromium-only event. `prompt()` resolves and
/// `userChoice` settles, which is the whole contract the composable uses.
const makePromptEvent = (outcome: "accepted" | "dismissed" = "accepted"): Event & Record<string, unknown> => {
   const event = new Event("beforeinstallprompt") as Event & Record<string, unknown>

   event.prompt = vi.fn(async() => {})
   event.userChoice = Promise.resolve({ outcome, platform: "web" })
   event.platforms = ["web"]

   return event
}

/// The listeners live in a client plugin in the real app; the tests call
/// `listen()` directly so each one starts from a known state.
const offer = (outcome: "accepted" | "dismissed" = "accepted"): Event => {
   const event = makePromptEvent(outcome)

   window.dispatchEvent(event)

   return event
}

afterEach(() => {
   const { canInstall } = useInstallPrompt()

   canInstall.value = false
   vi.restoreAllMocks()
})

describe("useInstallPrompt", () => {
   it("stays unavailable until the browser offers an install", () => {
      const { canInstall } = useInstallPrompt()

      // Safari and Firefox never fire the event, so this is their permanent
      // state — and it is also the state during SSR on every browser.
      expect(canInstall.value).toBe(false)
   })

   it("becomes available when the browser offers", () => {
      const { canInstall, listen } = useInstallPrompt()

      listen()
      offer()

      expect(canInstall.value).toBe(true)
   })

   it("leaves the browser's own banner alone", () => {
      const { canInstall, listen } = useInstallPrompt()

      listen()
      const event = makePromptEvent()
      const prevented = vi.spyOn(event, "preventDefault")

      window.dispatchEvent(event)

      // Calling preventDefault() here would suppress Chromium's install
      // banner, which is a far more prominent ask than a footer button and
      // costs nothing. The two are meant to run together: the banner for
      // first-time visitors, the button as the standing fallback.
      //
      // This assertion is the guard on that decision — re-adding the call
      // would silently take the banner away again.
      expect(prevented).not.toHaveBeenCalled()
      // ...and the event is still captured, so the button still works.
      expect(canInstall.value).toBe(true)
   })

   it("opens the real dialog and reports the outcome", async() => {
      const { install, listen } = useInstallPrompt()

      listen()
      const event = offer("accepted") as Event & { prompt: () => Promise<void> }

      await expect(install()).resolves.toBe("accepted")
      expect(event.prompt).toHaveBeenCalled()
   })

   it("does nothing when there is no live offer", async() => {
      const { install } = useInstallPrompt()

      await expect(install()).resolves.toBeNull()
   })

   it("does not reuse a spent event", async() => {
      const { canInstall, install, listen } = useInstallPrompt()

      listen()
      offer()
      await install()

      // A second prompt() on the same event throws in Chromium, so the
      // button has to go until a fresh event arrives.
      expect(canInstall.value).toBe(false)
      await expect(install()).resolves.toBeNull()
   })

   it("withdraws the offer once the app is installed", () => {
      const { canInstall, listen } = useInstallPrompt()

      listen()
      offer()
      // Fires for an install started from the browser's own menu too, so
      // the button also disappears for someone who never touched it.
      window.dispatchEvent(new Event("appinstalled"))

      expect(canInstall.value).toBe(false)
   })
})

describe("InstallButton", () => {
   it("renders nothing when the browser has not offered", async() => {
      const button = await mountSuspended(InstallButton)

      expect(button.find("button").exists()).toBe(false)
   })

   it("renders once the browser offers", async() => {
      const { canInstall } = useInstallPrompt()

      canInstall.value = true

      const button = await mountSuspended(InstallButton)

      expect(button.find("button").text()).toContain("Install app")
   })

   it("describes itself without breaking Label in Name", async() => {
      const { canInstall } = useInstallPrompt()

      canInstall.value = true

      const button = await mountSuspended(InstallButton)
      const described = button.find("button").attributes("aria-describedby")

      // WCAG 2.5.3: the accessible name has to contain the visible text, so
      // the extra context is a description rather than an aria-label.
      expect(described).toBe("install-button-hint")
      expect(button.find(`#${described}`).text()).toBe("Works offline")
      expect(button.find("button").attributes("aria-label")).toBeUndefined()
   })
})
