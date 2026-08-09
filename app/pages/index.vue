<template>
   <main class="page stack stack--loose">
      <header class="page-header">
         <h1 class="page-header__title">
            {{ COPY.home.heading }}
         </h1>
         <p class="page-header__lede">
            {{ COPY.home.tagline }}
         </p>
      </header>

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.home.toolsHeading }}
         </h2>
         <ul class="card-grid">
            <li v-for="tool in TOOLS" :key="tool.slug">
               <ToolCard :tool="tool" />
            </li>
         </ul>
      </section>
   </main>
</template>

<script lang="ts" setup>
useAppSeo({
   title: SEO.home.title,
   description: SEO.home.description,
})

// The home title already leads with the brand, and nuxt-seo-utils appends
// the site name by default — which would render "Metrics Adda | Metrics
// Adda". Drop the suffix here only.
useHead({ titleTemplate: "%s" })

defineOgImage("Home", {
   title: COPY.site.name,
   subtitle: COPY.home.tagline,
})

useSchemaOrg([
   defineWebSite({ name: COPY.site.name }),
   defineWebPage(),
   // Lists every tool as an entry, which is what tells a crawler these
   // five pages are a set rather than five unrelated URLs.
   defineItemList({
      itemListElement: TOOLS.map((tool) => ({
         name: COPY.tools[tool.key].name,
         url: tool.path,
      })),
   }),
])
</script>

<style scoped lang="scss">
.page-header__title {
   max-inline-size: 20ch;
}
</style>
