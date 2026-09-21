<template>
   <main class="page stack stack--loose">
      <ToolGroupSection group="generators" heading="h1" />

      <!-- Sideways links. Without them this page's every link points down
           at its own tools, which makes it a leaf rather than one of four
           pages in a layer. -->
      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.common.otherCategories }}
         </h2>
         <CategoryChips mode="hub" exclude="generators" />
      </section>
   </main>
</template>

<script lang="ts" setup>
/// The generators hub.
///
/// A page rather than an anchor on the home page, and that is the whole
/// point of it: a path gets its own prerendered HTML, its own title and
/// its own sitemap entry, so it can answer the plural query — "online generators"
/// — that no single tool page is built for.
///
/// An explicit file rather than a `[group].vue` route. A dynamic segment
/// at the site root matches every unknown path too, so it needs a
/// `validate` guard, and getting that wrong turns each genuine 404 into
/// an empty hub — a soft 404, indexed, which is worse than the 404 it
/// replaced. Four files of a dozen lines is the cheaper side of that.

useAppSeo({
   title: SEO.generatorsHub.title,
   description: SEO.generatorsHub.description,
})

defineOgImage("Home", {
   title: COPY.groups.generators.heading,
   subtitle: COPY.groups.generators.lede,
})

useSchemaOrg([
   defineWebPage(),
   // One list, on the page whose entire content is that list — which is
   // what the home page cannot say, because it holds six of them.
   defineItemList({
      itemListElement: toolsByGroup("generators").map((tool) => ({
         name: COPY.tools[tool.key].name,
         url: tool.path,
      })),
   }),
])
</script>
