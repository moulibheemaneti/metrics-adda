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
         <!-- The hub link, on every tool page rather than only on the home
              page. Eighteen inbound links is what gets a new category page
              crawled and understood as the parent of the tools around it;
              one link from the home page is not. -->
         <p v-if="hub" class="tool-shell__hub">
            <NuxtLink class="tool-shell__hub-link" :to="hub.to">
               {{ hub.label }}
               <span aria-hidden="true">→</span>
            </NuxtLink>
         </p>
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

/// This tool's own category hub, when its group has one.
///
/// Read off the registry by slug rather than taken as a prop: the group a
/// tool belongs to is already recorded once, and asking each of eighteen
/// pages to repeat it is eighteen chances to repeat it wrongly.
const hub = computed(() => {
   const group = TOOLS.find((tool) => tool.slug === props.slug)?.group

   if (group === undefined || !isHubGroup(group)) return null

   return {
      to: hubPath(group),
      label: COPY.common.seeAll
         .replace("{count}", String(toolsByGroup(group).length))
         .replace("{plural}", COPY.groups[group].plural),
   }
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.tool-shell {
   &__hub-link {
      color: var(--accent);
      font-size: px-to-rem(15);
      font-weight: var(--weight-label);

      &:hover {
         text-decoration: underline;
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
         border-radius: var(--radius-sm);
      }
   }
}
</style>
