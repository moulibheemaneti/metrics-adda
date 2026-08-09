<template>
   <NuxtLayout>
      <main class="page stack stack--loose error-page">
         <section class="error-page__header">
            <p class="error-page__code">
               {{ copy.code }}
            </p>
            <h1 class="error-page__title">
               {{ copy.heading }}
            </h1>
            <p class="error-page__lede">
               {{ copy.lede }}
            </p>
            <button class="button button--primary error-page__home" type="button" @click="goHome">
               {{ COPY.error.home }}
            </button>
         </section>

         <!-- A dead end is a wasted visit. Every tool is one click away, which
              also keeps the internal link graph intact on a page crawlers do
              reach through stale external links. -->
         <section class="stack stack--tight">
            <h2 class="section-heading">
               {{ COPY.error.toolsHeading }}
            </h2>
            <ul class="card-grid">
               <li v-for="tool in TOOLS" :key="tool.slug">
                  <ToolCard :tool="tool" />
               </li>
            </ul>
         </section>
      </main>
   </NuxtLayout>
</template>

<script lang="ts" setup>
import type { NuxtError } from "#app"

const props = defineProps<{
   error: NuxtError
}>()

const isNotFound = computed(() => props.error.statusCode === 404)
const copy = computed(() => (isNotFound.value ? COPY.error.notFound : COPY.error.unexpected))

useHead({
   // Static, and without the brand suffix appended twice. Deliberately does
   // not include the requested path — Nuxt's default page does, which puts
   // whatever was in the URL straight into the browser tab.
   title: `${copy.value.code} — ${copy.value.heading} | ${COPY.site.name}`,
   titleTemplate: "%s",
   meta: [
      // Error pages must never be indexed: a 404 that gets into the index
      // competes with real pages and reports as a soft 404 in Search Console.
      { name: "robots", content: "noindex, follow" },
   ],
})

// `clearError` tears down the error state before navigating; a plain
// <NuxtLink> would leave the app stuck showing this page.
const goHome = (): Promise<void> => clearError({ redirect: "/" })
</script>

<style scoped lang="scss">
// Relative to app/, not app/components/ — this file sits a level higher
// than every component that imports the same helpers.
@use "./assets/scss/abstracts" as *;

.error-page {
   &__header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2xs);
      padding-block: var(--space-lg) var(--space-2xs);
   }

   &__code {
      font-family: var(--font-display);
      font-size: px-to-rem(15);
      font-weight: var(--weight-heading);
      letter-spacing: 0.12em;
      // The gradient sits on the status code rather than the heading, so the
      // heading keeps a solid colour the contrast audit can measure.
      background-image: var(--gradient-brand);
      background-clip: text;
      color: transparent;
   }

   &__title {
      max-inline-size: 20ch;
      font-size: clamp(#{px-to-rem(30)}, 5vw, #{px-to-rem(46)});
      line-height: 1.1;
   }

   &__lede {
      max-inline-size: var(--measure);
      color: var(--ink-soft);
      font-size: px-to-rem(17);
      line-height: 1.6;
   }

   &__home {
      margin-block-start: var(--space-2xs);
   }
}
</style>
