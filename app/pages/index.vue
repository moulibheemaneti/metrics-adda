<template>
   <main class="page stack stack--loose">
      <section class="hero">
         <p class="hero__eyebrow">
            {{ eyebrow }}
         </p>
         <h1 class="hero__title">
            {{ COPY.home.headingLead }}
            <span class="hero__accent">{{ COPY.home.headingAccent }}</span>
         </h1>
         <p class="hero__lede">
            {{ COPY.home.tagline }}
         </p>
      </section>

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
// The eyebrow states how many tools the grid below holds, so it reads the
// count off the registry rather than repeating it in the copy.
const eyebrow = COPY.home.eyebrow.replace("{count}", String(TOOLS.length))

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
   subtitle: COPY.site.tagline,
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
