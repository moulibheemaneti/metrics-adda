<template>
   <nav class="category-chips" :aria-label="label">
      <ul class="category-chips__list" :class="{ 'category-chips__list--start': mode === 'hub' }">
         <li v-for="chip in chips" :key="chip.to">
            <!-- An in-page anchor is a plain <a>: `NuxtLink` treats a bare
                 fragment as a route and would push a history entry for a
                 scroll. The hub chips are real navigations and take
                 `NuxtLink` so they prefetch like every other internal link. -->
            <a v-if="mode === 'anchor'" class="category-chips__chip" :href="chip.to">
               {{ chip.label }}
            </a>
            <NuxtLink v-else class="category-chips__chip" :to="chip.to">
               {{ chip.label }}
            </NuxtLink>
         </li>
      </ul>
   </nav>
</template>

<script lang="ts" setup>
/// The row of category pills, in its two forms.
///
/// On the home page it is anchors into the sections further down: the
/// page keeps every card, and the row is what stops its length mattering
/// — you pick a category rather than travelling to one. On a hub page it
/// is links to the sibling hubs, so the four read as one layer of the
/// site rather than four leaves hanging off the home page.
///
/// Deliberately not a tab bar. Tabs would show one category at a time,
/// which is what a hub page already does — except a tab has no URL, so
/// there is nothing to rank, nothing to put in the sitemap, and ten of
/// eighteen tool links vanish from the most-linked page on the site.

import type { ToolGroup } from "~/utils/tools"

const props = withDefaults(defineProps<{
   /// `anchor` scrolls within the home page; `hub` navigates to the
   /// category pages.
   mode?: "anchor" | "hub"
   /// The group whose own page this is, left out of a `hub` row so it
   /// does not link to itself.
   exclude?: ToolGroup
}>(), {
   mode: "anchor",
   exclude: undefined,
})

const label = computed(() =>
   props.mode === "anchor" ? COPY.home.categoriesLabel : COPY.common.otherCategories)

const chips = computed(() => {
   if (props.mode === "anchor") {
      return occupiedGroups().map((group) => ({
         label: COPY.groups[group].heading,
         to: `#${groupSectionId(group)}`,
      }))
   }

   return [
      // The home page first: from a hub, "everything" is the one
      // destination the sibling chips cannot express.
      { label: COPY.common.allTools, to: "/" },
      ...hubGroups()
         .filter((group) => group !== props.exclude)
         .map((group) => ({ label: COPY.groups[group].heading, to: hubPath(group) })),
   ]
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.category-chips {
   &__list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
      justify-content: center;
      list-style: none;

      /// Centred under the home page's centred hero, and left-aligned on a
      /// hub page, where everything else on the page is.
      &--start {
         justify-content: flex-start;
      }
   }

   &__chip {
      display: block;
      padding: var(--space-3xs) var(--space-sm);
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background-color: var(--surface);
      color: var(--ink-soft);
      font-size: px-to-rem(15);
      white-space: nowrap;
      transition:
         border-color var(--duration) var(--ease),
         color var(--duration) var(--ease);

      &:hover {
         border-color: var(--accent);
         color: var(--accent-strong);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }
}
</style>
