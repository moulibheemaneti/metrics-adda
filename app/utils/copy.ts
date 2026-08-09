/// --------------------------------------------------
/// utils/copy.ts
/// --------------------------------------------------
/// Every user-facing string on the site, in one place.
///
/// The site is single-locale English, so there is no translation layer:
/// components read these constants directly instead of calling a `t()`
/// helper. Keeping the copy here rather than inline in templates preserves
/// the one property that matters — all wording is reviewable and editable
/// from a single file — while making a mistyped key a type error rather
/// than a raw key rendered to the page.
///
/// Auto-imported by Nuxt. Tests import it relatively (see test/unit).
/// --------------------------------------------------

/** Pages that carry their own search metadata. */
export type PageKey = "home"

export interface SeoCopy {
   /** Rendered as <title>. Budget: SEO_TITLE_MAX. */
   title: string
   /** Rendered as <meta name="description">. Budget: SEO_DESCRIPTION_MAX. */
   description: string
}

/**
 * Per-page search metadata.
 *
 * Every entry is length-checked against the SERP budgets in `utils/seo.ts`
 * by `test/unit/seo.test.ts` — a title over 60 characters or a description
 * over 155 fails the suite rather than getting silently clipped by Google.
 */
export const SEO: Record<PageKey, SeoCopy> = {
   home: {
      title: "Metrics Adda",
      description: "Metrics Adda — coming soon.",
   },
}

export const COPY = {
   site: {
      name: "Metrics Adda",
      tagline: "Coming soon.",
   },
   nav: {
      home: "Home",
   },
   footer: {
      contact: "Contact",
      rights: "All rights reserved.",
   },
   home: {
      heading: "Metrics Adda",
      tagline: "Coming soon.",
   },
} as const
