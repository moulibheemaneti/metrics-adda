// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

   modules: [
      "@nuxt/eslint",
      "@nuxt/fonts",
      "@nuxt/image",
      "@nuxtjs/seo",
      "@vite-pwa/nuxt",
      // Vercel Analytics + Speed Insights load `/_vercel/*` scripts that only
      // exist on the Vercel platform. Off-platform they 404 and log console
      // errors, which lowers the local Lighthouse "Best Practices" score.
      //
      // Now that the site is installable, that stopped being cosmetic: an
      // installed PWA opened offline would fire two requests that can never
      // resolve. Gating on `VERCEL` (set automatically on Vercel) keeps them
      // out of every build that is not the deployed site.
      ...(process.env.VERCEL ? ["@vercel/analytics", "@vercel/speed-insights"] : []),
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
         link: [
            // iOS ignores the web app manifest's icons and reads this instead.
            // Flattened onto the brand colour because iOS composites
            // transparency against black — see `public/README.md`.
            { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
         ],
         meta: [
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            // iOS has no manifest support for `display: standalone`; these two
            // are what give an installed icon a chromeless window there.
            { name: "apple-mobile-web-app-capable", content: "yes" },
            { name: "apple-mobile-web-app-title", content: "Metrics Adda" },
            // Mobile browser chrome follows the OS setting. This tracks the
            // `prefers-color-scheme` default rather than a manual override —
            // a stored override is not knowable at SSR, and guessing wrong
            // paints the wrong colour on the very first frame.
            { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
            { name: "theme-color", content: "#0b0f1a", media: "(prefers-color-scheme: dark)" },
         ],
         script: [
            {
               // Applies a stored theme choice BEFORE the first paint.
               //
               // This cannot wait for Vue: by the time the app hydrates the
               // page has already painted, so a visitor who chose dark would
               // see a white flash on every single navigation. It cannot be
               // an external file either — that would race the stylesheet.
               // Inline, blocking, and first in <head> is the whole point.
               //
               // Reads the key owned by `composables/useTheme.ts`; the two
               // must stay in step. Wrapped in try/catch because localStorage
               // throws outright when a browser blocks site data.
               innerHTML: "(function(){try{var t=localStorage.getItem(\"ma-theme\");if(t===\"dark\"||t===\"light\")document.documentElement.setAttribute(\"data-theme\",t)}catch(e){}})()",
               tagPosition: "head",
               tagPriority: "critical",
            },
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

   // Google AdSense wiring for `components/AdSlot.vue`. Runtime rather than
   // build-time `process.env` so the publisher ID can be rotated in the
   // Vercel dashboard without a rebuild.
   //
   // Both default to empty, and an empty client id switches ads off
   // entirely: no <ins>, no `adsbygoogle.js`, no third-party request. That
   // is deliberately the state local dev and CI run in, so `lighthouse.sh`
   // measures the site rather than Google's ad auction.
   runtimeConfig: {
      public: {
         adsenseClient: "",
         adsenseSlotFooter: "",
      },
   },

   // YYYY-MM-DD
   compatibilityDate: "2026-08-09",

   nitro: {
      // Every route is static: nothing here fetches at request time, so
      // there is no per-request work for a server to do. Prerendering is
      // what makes the site installable — the service worker can only
      // precache HTML that exists as a file at build time, and without it
      // an offline visit to a route the user has not opened yet would miss.
      //
      // `crawlLinks` rather than a hardcoded list: every tool page links to
      // every other one (`relatedTools()` in app/utils/tools.ts) and the
      // footer carries the four static pages, so starting at "/" reaches all
      // 22. A hardcoded list would silently drift from the tool registry.
      prerender: {
         crawlLinks: true,
         routes: ["/"],
      },

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

   // Installable, offline-capable PWA. The whole site already runs in the
   // browser and sends nothing, so "works offline" is a packaging question
   // rather than a feature — every tool keeps working once the shell is
   // cached.
   pwa: {
      // No update prompt to build or design: the tools hold no unsaved work,
      // so replacing the worker on the next navigation costs the user
      // nothing and there is never a stale build in the wild.
      registerType: "autoUpdate",

      manifest: {
         id: "/",
         name: "Metrics Adda",
         short_name: "Metrics Adda",
         description: "Fast, free unit converters and everyday tools. Works offline.",
         lang: "en",
         start_url: "/",
         scope: "/",
         display: "standalone",
         categories: ["utilities", "productivity"],
         // A manifest gets ONE colour where the site has two: the
         // `theme-color` metas above switch on `prefers-color-scheme`, and
         // the manifest cannot. Both take the light value, matching the
         // first-paint default for the same reason the metas do — a stored
         // theme override is not knowable before the app boots. The metas
         // still win for browser chrome once the page is open; this only
         // sets the Android splash screen and task-switcher colour.
         background_color: "#ffffff",
         theme_color: "#ffffff",
         icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            // Full-bleed, brand-coloured to the edge. Android crops this to
            // whatever shape the launcher uses, so it cannot have the
            // transparent corners the plain icons do.
            { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
         ],
      },

      workbox: {
         // Shell only: markup, script, styles, the two self-hosted webfonts
         // and the favicon. Deliberately no blanket `png` — the manifest
         // icons are read by the OS at install time and never by the page,
         // so sweeping them in would add ~650 KB to every install for
         // nothing.
         //
         // `_ipx/**` is the exception, and it is the header mark: prerender
         // resolves @nuxt/image's <NuxtImg> to real files on disk, and both
         // variants together are 2.2 KB. Cheap enough to have the header
         // render correctly on a first load that goes offline immediately.
         globPatterns: ["**/*.{js,css,html,woff2,ico}", "_ipx/**/*"],

         // On Vercel the same <NuxtImg> resolves to the platform's image
         // provider (`/_vercel/image?…`) instead, which is a runtime URL and
         // so cannot be globbed at all. This catches it on first sight. The
         // mark is decorative and `aria-hidden`, so the worst case is a
         // missing 28px logo until then.
         runtimeCaching: [
            {
               urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
               handler: "StaleWhileRevalidate",
               options: {
                  cacheName: "images",
                  expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 },
               },
            },
         ],

         // Backstop for a URL that was never prerendered — serve the hub
         // rather than the browser's offline error. Precached routes still
         // win, because precache routes are registered before this one.
         navigateFallback: "/",
         // …but these are not app routes, and answering them with the hub's
         // HTML would be worse than letting them fail.
         //
         // `.well-known` holds `assetlinks.json`, which Android reads to
         // verify the Play Store TWA. It is listed for completeness rather
         // than necessity: that fetch happens outside any service worker and
         // is not a navigation, so this rule would never fire on it. Leaving
         // it out would make this list an incomplete inventory of the paths
         // that are not app routes, which is the only thing it is for.
         navigateFallbackDenylist: [/^\/_/, /^\/__/, /^\/\.well-known\//, /^\/(robots\.txt|sitemap.*\.xml|ads\.txt)$/],
      },

      // The SW is a production concern and rebuilding it on every HMR pass
      // slows dev down for no benefit. Enable temporarily to debug caching.
      devOptions: { enabled: false },
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
