/// --------------------------------------------------
/// utils/seo.ts
/// --------------------------------------------------
/// Length budgets for search-result metadata, plus the one helper that
/// enforces them. Kept out of `useAppSeo` so page-level code can build a
/// title or description and know, before it ships, whether Google will
/// clip it. Auto-imported by Nuxt.
/// --------------------------------------------------

/** Characters Google renders of a <title> before it clips with an ellipsis. */
export const SEO_TITLE_MAX = 60

/** Characters Google renders of a meta description before clipping. */
export const SEO_DESCRIPTION_MAX = 155

/**
 * Clip `text` to `limit` characters, cutting on a word boundary rather than
 * mid-word and marking the cut with an ellipsis. Text already within the
 * limit is returned untouched.
 *
 * The ellipsis is counted, so the result never exceeds `limit`.
 */
export const truncate = (text: string, limit: number): string => {
   if (text.length <= limit) return text

   const clipped = text.slice(0, limit - 1)
   const lastSpace = clipped.lastIndexOf(" ")

   return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`
}
