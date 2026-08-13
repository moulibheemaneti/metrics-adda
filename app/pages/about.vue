<template>
   <main class="page stack stack--loose">
      <header class="page-header">
         <h1 class="page-header__title">
            {{ COPY.about.heading }}
         </h1>
         <p class="page-header__lede">
            {{ COPY.about.lede }}
         </p>
      </header>

      <section v-for="section in sections" :key="section.heading" class="stack stack--tight">
         <h2 class="section-heading">
            {{ section.heading }}
         </h2>
         <p v-for="paragraph in section.body" :key="paragraph" class="prose__body">
            {{ paragraph }}
         </p>
      </section>

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.about.contactHeading }}
         </h2>
         <p class="prose__body">
            {{ COPY.about.contactBody }}
            <a :href="`mailto:${SITE_EMAIL}`">{{ SITE_EMAIL }}</a>
         </p>
      </section>
   </main>
</template>

<script lang="ts" setup>
/// Expected of a site carrying AdSense: Google's pre-review checklist names
/// an "About us" page alongside the policy, and a site that is otherwise
/// only calculators reads as low-value without one.
///
/// Built the same way as `privacy-policy.vue` and for the same reasons —
/// not on `ToolShell`, which wraps its slot in an FAQ and an "other tools"
/// grid that belong on a tool and not here, and deliberately absent from
/// `utils/tools.ts`, which drives the nav and is for tools.

/// The tool count is read from the registry rather than written into the
/// copy, so the prose cannot claim a number the grid does not have.
const sections = COPY.about.sections.map((section) => ({
   ...section,
   body: section.body.map((paragraph) =>
      paragraph.replace("{count}", String(TOOLS.length))),
}))

useAppSeo({
   title: SEO.about.title,
   description: SEO.about.description,
})

defineOgImage("Tool", {
   title: COPY.about.heading,
   subtitle: COPY.site.name,
})

/// A plain WebPage: no FAQPage or SoftwareApplication markup, because this
/// is neither. The Organization identity comes from nuxt.config.
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
}
</style>
