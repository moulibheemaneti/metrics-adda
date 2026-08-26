/// --------------------------------------------------
/// server/routes/llms.txt.ts
/// --------------------------------------------------
/// Serves `/llms.txt`, prerendered to a static file at build time like
/// every other route on the site.
///
/// A route rather than a file in `public/`: the listing is derived from
/// the tool registry (see `app/utils/llms.ts`), so it has to be generated,
/// and generating it here means the site URL comes from the same site
/// config that the sitemap, canonicals and OG images already read — a
/// preview deploy emits its own URLs instead of production's.
/// --------------------------------------------------

import { llmsTxt } from "~/utils/llms"

export default defineEventHandler((event) => {
   // `getSiteConfig` is auto-imported by nuxt-site-config's Nitro preset.
   const { url } = getSiteConfig(event)

   // Markdown by content, but `text/plain` by convention: llms.txt is meant
   // to be fetched and read, and a browser that opens it should show it
   // rather than offer to download it.
   setHeader(event, "content-type", "text/plain; charset=utf-8")

   return llmsTxt(url ?? "")
})
