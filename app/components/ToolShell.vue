<template>
   <main class="page stack stack--loose">
      <header class="page-header">
         <h1 class="page-header__title">
            {{ copy.heading }}
         </h1>
         <p class="page-header__lede">
            {{ copy.lede }}
         </p>
      </header>

      <slot />

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.common.faqHeading }}
         </h2>
         <ul class="faq">
            <li v-for="entry in faq" :key="entry.question">
               <h3 class="faq__question">
                  {{ entry.question }}
               </h3>
               <p class="faq__answer">
                  {{ entry.answer }}
               </p>
            </li>
         </ul>
      </section>

      <section class="stack stack--tight">
         <h2 class="section-heading">
            {{ COPY.common.relatedHeading }}
         </h2>
         <ul class="card-grid">
            <li v-for="related in others" :key="related.slug">
               <ToolCard :tool="related" />
            </li>
         </ul>
      </section>
   </main>
</template>

<script lang="ts" setup>
import type { ToolKey } from "~/utils/copy"

/// Every tool page renders through this, which is what keeps the <main>
/// element (required by the layout's `:deep(main) { flex: 1 }` rule), the
/// heading hierarchy, the FAQ and the cross-links consistent across pages
/// instead of being re-typed five times.

const props = defineProps<{
   /** Registry key — selects the copy, FAQ and cross-links for this page. */
   toolKey: ToolKey
   /** URL slug, so the page excludes itself from its own "other tools" list. */
   slug: string
}>()

const copy = computed(() => COPY.tools[props.toolKey])
const faq = computed(() => COPY.faq[props.toolKey])
const others = computed(() => relatedTools(props.slug))
</script>
