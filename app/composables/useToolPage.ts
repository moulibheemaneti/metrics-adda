import type { ToolKey } from "~/utils/copy"

/**
 * Wires up everything a tool page needs beyond its markup: search
 * metadata, the Open Graph card, and structured data.
 *
 * Factored out because all five pages need exactly the same wiring, and
 * because it keeps the pages themselves down to "which panel, which
 * copy" — the part that actually differs.
 *
 * The FAQ is emitted twice on purpose: once as visible markup by
 * `ToolShell`, and once here as FAQPage structured data. Both read from
 * `COPY.faq`, so the answer a crawler sees is always the answer on the
 * page.
 */
export function useToolPage(key: ToolKey) {
   const copy = COPY.tools[key]
   const seo = SEO[key]

   useAppSeo({
      title: seo.title,
      description: seo.description,
   })

   defineOgImage("Tool", {
      title: copy.heading,
      subtitle: copy.tagline,
   })

   useSchemaOrg([
      defineWebPage({ "@type": "FAQPage" }),
      defineSoftwareApp({
         name: copy.name,
         description: seo.description,
         // Free browser tools with nothing to install: an explicit zero
         // price is the honest way to say so in structured data.
         applicationCategory: "UtilitiesApplication",
         operatingSystem: "Any",
         offers: {
            price: 0,
            priceCurrency: "INR",
         },
      }),
      ...COPY.faq[key].map((entry) =>
         defineQuestion({
            name: entry.question,
            acceptedAnswer: entry.answer,
         }),
      ),
   ])
}
