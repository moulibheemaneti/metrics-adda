/// --------------------------------------------------
/// composables/useTheme.ts
/// --------------------------------------------------
/// The system / light / dark preference.
///
/// "System" is represented by the *absence* of `data-theme` on <html>
/// rather than by `data-theme="system"`, because that is what lets the
/// `prefers-color-scheme` media query in `themes/_dark.scss` decide. An
/// explicit choice writes the attribute and wins over the OS.
///
/// Applying the stored preference on load is deliberately *not* done
/// here: by the time Vue hydrates, the page has already painted, and a
/// visitor who chose dark would see a white flash first. That job belongs
/// to the inline head script in `nuxt.config.ts`, which runs before the
/// first paint. This composable owns everything after that.
/// --------------------------------------------------

export type ThemePreference = "system" | "light" | "dark"

/** Shared with the inline head script in `nuxt.config.ts` — keep in step. */
export const THEME_STORAGE_KEY = "ma-theme"

export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"]

const isThemePreference = (value: unknown): value is ThemePreference =>
   typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference)

/** Write the preference to <html>, where the CSS is watching for it. */
function applyTheme(preference: ThemePreference): void {
   const root = document.documentElement

   if (preference === "system") {
      root.removeAttribute("data-theme")

      return
   }

   root.setAttribute("data-theme", preference)
}

export function useTheme() {
   // `useState` rather than a module-level ref so the value is per-request
   // on the server instead of leaking between visitors.
   const preference = useState<ThemePreference>("theme", () => "system")

   /** Read what the head script already decided, so the UI agrees with the page. */
   const sync = (): void => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)

      preference.value = isThemePreference(stored) ? stored : "system"
   }

   const setTheme = (next: ThemePreference): void => {
      preference.value = next
      applyTheme(next)

      // "System" is the default, so it is stored as the absence of a key —
      // which also means a visitor who resets to system picks up any later
      // change to the default rather than being pinned to today's.
      if (next === "system") {
         localStorage.removeItem(THEME_STORAGE_KEY)

         return
      }

      localStorage.setItem(THEME_STORAGE_KEY, next)
   }

   return { preference, setTheme, sync }
}
