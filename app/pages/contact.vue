<template>
   <main class="page stack stack--loose">
      <header class="page-header">
         <h1 class="page-header__title">
            {{ COPY.contact.heading }}
         </h1>
         <p class="page-header__lede">
            {{ COPY.contact.lede }}
         </p>
      </header>

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.contact.emailHeading }}
         </h2>
         <p class="prose__body">
            {{ COPY.contact.emailBody }}
            <a class="prose__address" :href="`mailto:${SITE_EMAIL}`">{{ SITE_EMAIL }}</a>
         </p>
         <p class="prose__body">
            {{ COPY.contact.responseNote }}
         </p>
      </section>

      <section v-for="section in COPY.contact.sections" :key="section.heading" class="stack stack--tight">
         <h2 class="section-heading">
            {{ section.heading }}
         </h2>
         <p v-for="paragraph in section.body" :key="paragraph" class="prose__body">
            {{ paragraph }}
         </p>
      </section>
   </main>
</template>

<script lang="ts" setup>
/// Expected of a site carrying AdSense: Google's pre-review checklist names
/// a "Contact us" page, and the footer's `mailto:` is not one — it is a
/// dead end for a reader with no mail client configured, and invisible to
/// a reviewer looking for the page.
///
/// Same construction as `privacy-policy.vue`: not `ToolShell`, and not in
/// `utils/tools.ts`.

useAppSeo({
   title: SEO.contact.title,
   description: SEO.contact.description,
})

defineOgImage("Tool", {
   title: COPY.contact.heading,
   subtitle: COPY.site.name,
})

/// A plain WebPage. `ContactPage` would be the more specific schema.org
/// type, but nuxt-schema-org has no `defineContactPage` helper and the
/// added specificity buys nothing in search.
useSchemaOrg([
   defineWebPage(),
])
</script>

<style scoped lang="scss">
.prose {
   &__body {
      max-inline-size: var(--measure);
      color: var(--ink-soft);
      line-height: 1.7;
   }

   /// The address is the one thing on this page a reader is looking for, so
   /// it gets the accent rather than inheriting body colour.
   &__address {
      color: var(--accent);
   }
}
</style>
