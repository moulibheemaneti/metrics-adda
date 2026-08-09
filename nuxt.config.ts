// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

   modules: [
      "@nuxt/eslint",
      "@nuxt/fonts",
      "@nuxt/image",
      "@nuxtjs/seo",
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
         // title and description are managed by Nuxt SEO (site config).
         // `lang` is set explicitly: the site is single-locale, and with no
         // i18n module in play nothing else would emit it — a missing lang
         // is a screen-reader pronunciation bug and an a11y audit failure.
         htmlAttrs: { lang: "en" },
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
      // then can't run it and falls back to serving the static SPA shell, so
      // nothing server-rendered survives — no SSR HTML, and every route that
      // Nitro was meant to handle 404s into the SPA fallback instead.
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

   // Self-hosted webfonts, no runtime Google requests and — because each
   // family names an explicit `src` — no provider lookup at build time
   // either, so builds work offline and reproducibly.
   //
   // `fallbacks` is the load-bearing part: it makes the module emit
   // metric-override fallback faces (size-adjust, ascent-override…) so the
   // system font stands in at the same measurements as the webfont. Without
   // them the text reflows the moment the webfont swaps in, which is exactly
   // the layout shift the Lighthouse CLS budget fails the build over.
   //
   // Files live in `public/fonts/` — see the README there before changing.
   fonts: {
      families: [
         {
            name: "Inter",
            src: "/fonts/inter-latin-variable.woff2",
            weight: "400 700",
            fallbacks: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
         },
         {
            name: "Sora",
            src: "/fonts/sora-latin-variable.woff2",
            weight: "500 700",
            fallbacks: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
         },
      ],
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
