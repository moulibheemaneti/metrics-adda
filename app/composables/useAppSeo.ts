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
 * Pass already-translated strings (e.g. from `useI18n().t(...)`) so the meta
 * stays in sync with the active locale. Canonical URLs and hreflang alternates
 * are handled automatically by nuxt-seo-utils + @nuxtjs/i18n.
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
