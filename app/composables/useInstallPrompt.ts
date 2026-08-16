/// --------------------------------------------------
/// composables/useInstallPrompt.ts
/// --------------------------------------------------
/// The browser's "add this to your home screen" offer.
///
/// Chromium fires `beforeinstallprompt` once it decides a site is
/// installable, and calling `preventDefault()` on it suppresses the
/// browser's own mini-infobar and hands the timing to us. The event object
/// is the only way to open the real install dialog later, so it has to be
/// kept.
///
/// This is Chromium-only by nature. Safari has never implemented the event
/// — on iOS the only route is Share → Add to Home Screen, which no API can
/// trigger — and Firefox does not install PWAs at all. There is nothing to
/// fall back to, so on those browsers `canInstall` simply stays false and
/// the button never renders. That is the intended behaviour, not a gap:
/// a button that cannot do anything is worse than no button.
/// --------------------------------------------------

/** Not in TypeScript's DOM lib, because it is not a standard. */
export interface BeforeInstallPromptEvent extends Event {
   readonly platforms: string[]
   readonly userChoice: Promise<{ outcome: "accepted" | "dismissed", platform: string }>
   prompt: () => Promise<void>
}

/// Module-level rather than `useState` because a DOM event is not
/// serialisable, and everything Nuxt puts in `useState` is serialised into
/// the SSR payload. It cannot leak between visitors the way a module-level
/// ref normally could on the server: the only writer is the
/// `beforeinstallprompt` listener, which `plugins/pwa-install.client.ts`
/// registers on the client alone. On the server this stays null forever.
let deferred: BeforeInstallPromptEvent | null = null

export function useInstallPrompt() {
   /// The rendering flag is `useState` — it is a plain boolean, so it is
   /// safe to serialise, and it has to be reactive for the button to appear.
   /// False during SSR always: whether the browser will offer an install is
   /// not knowable until it says so.
   const canInstall = useState<boolean>("pwa-can-install", () => false)

   /** Registered once, at startup, from the client plugin. */
   const listen = (): void => {
      window.addEventListener("beforeinstallprompt", (event) => {
         // Suppresses Chromium's own infobar. Without it the browser shows
         // its prompt *and* we show a button, which is two asks for one
         // action.
         event.preventDefault()
         deferred = event as BeforeInstallPromptEvent
         canInstall.value = true
      })

      // Fires when the install completes by any route, including the
      // browser's own menu item — so the button also disappears for someone
      // who never touched it.
      window.addEventListener("appinstalled", () => {
         deferred = null
         canInstall.value = false
      })
   }

   /**
    * Opens the real install dialog. Resolves to the user's choice, or null
    * if there was no live prompt to open.
    */
   const install = async(): Promise<"accepted" | "dismissed" | null> => {
      if (!deferred) return null

      await deferred.prompt()
      const { outcome } = await deferred.userChoice

      // The event is single-use: a second `prompt()` on the same object
      // throws. Chromium fires a fresh one if the visitor declines and the
      // site stays eligible, which is what brings the button back.
      deferred = null
      canInstall.value = false

      return outcome
   }

   return { canInstall, install, listen }
}
