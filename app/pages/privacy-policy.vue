<template>
   <main class="page stack stack--loose">
      <header class="page-header">
         <h1 class="page-header__title">
            {{ COPY.privacy.heading }}
         </h1>
         <p class="page-header__lede">
            {{ COPY.privacy.lede }}
         </p>
         <p class="policy__updated">
            {{ COPY.privacy.updated }}
         </p>
      </header>

      <section v-for="section in COPY.privacy.sections" :key="section.heading" class="stack stack--tight">
         <h2 class="section-heading">
            {{ section.heading }}
         </h2>
         <p v-for="paragraph in section.body" :key="paragraph" class="policy__body">
            {{ paragraph }}
         </p>
         <ul v-if="'links' in section" class="policy__links">
            <li v-for="link in section.links" :key="link.href">
               <!-- `noopener` on every outbound link, and `nofollow` because
                    these are references a policy has to carry, not
                    endorsements we want to pass ranking signal to. -->
               <a :href="link.href" rel="noopener nofollow" target="_blank">{{ link.label }}</a>
            </li>
         </ul>
      </section>

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.privacy.contactHeading }}
         </h2>
         <p class="policy__body">
            {{ COPY.privacy.contactBody }}
            <a :href="`mailto:${SITE_EMAIL}`">{{ SITE_EMAIL }}</a>
         </p>
      </section>
   </main>
</template>

<script lang="ts" setup>
/// The site's privacy disclosures live here. Deliberately not
/// built on `ToolShell` — that wraps its slot in an FAQ and an "other
/// tools" grid, neither of which belongs on a policy — and deliberately
/// absent from `utils/tools.ts`, which drives the nav and is for tools.

useAppSeo({
   title: SEO.privacy.title,
   description: SEO.privacy.description,
})

defineOgImage("Tool", {
   title: COPY.privacy.heading,
   subtitle: COPY.site.name,
})

/// A plain WebPage: no FAQPage or SoftwareApplication markup, because a
/// policy is neither. The Organization identity comes from nuxt.config.
useSchemaOrg([
   defineWebPage(),
])
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.policy {
   &__updated {
      color: var(--muted);
      font-size: px-to-rem(14);
   }

   &__body {
      max-inline-size: var(--measure);
      color: var(--ink-soft);
      line-height: 1.7;
   }

   &__links {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
      max-inline-size: var(--measure);
      list-style: none;

      a {
         color: var(--accent);
      }
   }
}
</style>
