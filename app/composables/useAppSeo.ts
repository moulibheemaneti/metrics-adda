interface AppSeoOptions {
   /** Page title (< 60 chars). Falls back to the site name. */
   title: string
   /** Meta description (< 160 chars). */
   description: string
   /** Open Graph type. Defaults to "website". */
   ogType?: "website" | "article"
}

/**
 * Centralises per-page SEO: title/description, Open Graph and Twitter cards.
 * Pass the strings from `utils/copy.ts` (see `SEO`), where the wording lives
 * and where the SERP length budgets are enforced. Canonical URLs are handled
 * automatically by nuxt-seo-utils; the site is single-locale, so there are no
 * hreflang alternates to emit.
 */
export function useAppSeo(options: AppSeoOptions) {
   const { title, description, ogType = "website" } = options

   useSeoMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogType,
      twitterCard: "summary_large_image",
      twitterTitle: title,
      twitterDescription: description,
   })
}
