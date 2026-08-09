// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

   modules: [
      "@nuxt/eslint",
      "@nuxt/fonts",
      "@nuxt/image",
      "@nuxtjs/seo",
      "@nuxtjs/i18n",
      // Vercel Analytics + Speed Insights load `/_vercel/*` scripts that only
      // exist on the Vercel platform. Running the production build locally
      // (e.g. `bun run .output/server/index.mjs`) makes them 404 and log
      // console errors, which lowers the local Lighthouse "Best Practices"
      // score. Harmless — they resolve correctly once deployed to Vercel.
      //
      // To silence them in local audits, gate on the `VERCEL` env var (set
      // automatically on Vercel) by replacing the two lines below with:
      //   ...(process.env.VERCEL ? ["@vercel/analytics", "@vercel/speed-insights"] : []),
      "@vercel/analytics",
      "@vercel/speed-insights",
      "@nuxt/test-utils/module",
   ],
   devtools: { enabled: true },

   app: {
      head: {
         // title, description and htmlAttrs.lang are managed by Nuxt SEO
         // (site config) and @nuxtjs/i18n. Keep only what they don't own.
         meta: [
            { name: "viewport", content: "width=device-width, initial-scale=1" },
         ],
      },
   },

   css: [
      "~/assets/scss/main.scss",
   ],

   // Site-wide identity — single source of truth for all Nuxt SEO modules
   // (sitemap, robots, og-image, schema.org, canonical URLs).
   site: {
      url: process.env.NUXT_SITE_URL || "https://www.metricsadda.com",
      name: "Metrics Adda",
      description: "Metrics Adda.",
      defaultLocale: "en",
   },

   // YYYY-MM-DD
   compatibilityDate: "2026-08-09",

   nitro: {
      // Force the Bun preset ONLY for local/self-hosted builds
      // (`bun run .output/server/index.mjs`). On Vercel we must NOT set a
      // preset: an explicit `preset` overrides Nitro's provider auto-detection
      // (`_name = kebabCase(name) || provider`), so hardcoding "bun" makes the
      // Vercel build emit a Bun server instead of `.vercel/output/`. Vercel
      // then can't run it and falls back to serving the static SPA shell — no
      // SSR and, critically, the `/_i18n/**` message routes 404 to the SPA
      // fallback, so @nuxtjs/i18n's lazy loader merges HTML into vue-i18n and
      // throws "Invalid value", leaving every locale untranslated.
      // Leaving preset unset on Vercel lets Nitro auto-detect the `vercel`
      // preset (via the VERCEL env var) and deploy real serverless functions.
      ...(process.env.VERCEL ? {} : { preset: "bun" }),
   },

   typescript: {
      // typeCheck: true,
      strict: true,
   },

   eslint: {
      config: {
         stylistic: true,
      },
   },

   // Self-hosted webfonts (no runtime Google requests). Left empty until the
   // typeface choice lands — the browser default stack in
   // `assets/scss/base/_global.scss` applies meanwhile.
   fonts: {
      families: [],
   },

   // English at "/", any future language prefixed. Add a locale here and drop
   // the matching `i18n/locales/<code>.json` beside `en.json` — nothing else
   // needs to change.
   i18n: {
      strategy: "prefix_except_default",
      defaultLocale: "en",
      // Absolute base URL so in-head hreflang/canonical are fully-qualified
      // (Google requires absolute URLs for hreflang annotations).
      baseUrl: process.env.NUXT_SITE_URL || "https://www.metricsadda.com",
      locales: [
         { code: "en", language: "en-IN", name: "English", file: "en.json" },
      ],
      // locale files resolve from <rootDir>/i18n/locales/*.json (v10 default)

      // Treat the chosen language as a sticky preference stored in a cookie.
      // `alwaysRedirect` + `redirectOn: "all"` enforce that preference on every
      // navigation, so pressing Back to a URL carrying an older locale prefix
      // redirects to the preferred locale. The cookie is updated by i18n
      // whenever the locale is switched, so manual switches don't fight the
      // redirect.
      detectBrowserLanguage: {
         useCookie: true,
         cookieKey: "ma_locale",
         alwaysRedirect: true,
         redirectOn: "all",
         // Don't infer from Accept-Language on the very first visit; honour the
         // URL the user actually landed on until they pick a language.
         fallbackLocale: "en",
      },
   },

   // Dynamic Open Graph images. Use the Satori renderer (via the installed
   // `satori` + `@resvg/resvg-js` deps and the `*.satori.vue` component
   // suffix) because it is edge/serverless-safe; the chromium renderer will
   // not run on the Bun/Nitro preset.
   ogImage: {
      defaults: {
         width: 1200,
         height: 630,
      },
   },

   // Schema.org identity used by useSchemaOrg() across pages.
   schemaOrg: {
      identity: {
         type: "Organization",
         name: "Metrics Adda",
         url: "https://www.metricsadda.com",
      },
   },
})
