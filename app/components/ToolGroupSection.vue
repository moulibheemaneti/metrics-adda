<template>
   <section class="tool-group stack stack--tight" :aria-labelledby="headingId">
      <div class="tool-group__header">
         <h2 :id="headingId" class="section-heading">
            {{ copy.heading }}
         </h2>
         <p class="tool-group__lede">
            {{ copy.lede }}
         </p>
      </div>
      <!-- `--fill` rather than the bare grid: `health` and `security` hold
           one tool each, and an auto-fit track with a single item in it
           stretches that card across the full page width. -->
      <ul class="card-grid card-grid--fill">
         <li v-for="tool in tools" :key="tool.slug">
            <ToolCard :tool="tool" />
         </li>
      </ul>
   </section>
</template>

<script lang="ts" setup>
/// One tool category, as a heading, a line of prose and its cards.
///
/// Written as a component rather than inline on the home page because it
/// has a second call site coming: a hub page at `/converters` renders
/// exactly this block, with the heading promoted to an <h1> and its own
/// title and description around it. Keeping the markup and the copy
/// lookup here means that page is a route and a heading level rather
/// than a second copy of the section to keep in step with this one.
///
/// It takes the group id and derives the rest, so a caller needs no more
/// than the name of a category — `toolsByGroup` is the registry's answer
/// to what is in one, and `COPY.groups` is the copy module's.

import type { ToolGroup } from "~/utils/tools"

const props = defineProps<{
   group: ToolGroup
}>()

/// `useId` rather than the group id itself: `text` and `health` are
/// plausible ids for something else on a page this component does not
/// control, and a duplicate id would point `aria-labelledby` at whichever
/// element came first.
const headingId = useId()

const copy = computed(() => COPY.groups[props.group])
const tools = computed(() => toolsByGroup(props.group))
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.tool-group {
   /// Heading and lede belong together more closely than either belongs to
   /// the cards, so they take the tighter gap `.page-header` uses for the
   /// same pairing on a tool page.
   &__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
   }

   &__lede {
      max-inline-size: var(--measure);
      color: var(--ink-soft);
      font-size: px-to-rem(15);
      line-height: 1.6;
   }
}
</style>
