<template>
   <nav class="tool-nav" :aria-label="COPY.nav.label">
      <ul class="tool-nav__list">
         <li v-for="tool in TOOLS" :key="tool.slug">
            <NuxtLink class="tool-nav__link" :to="tool.path">
               {{ COPY.tools[tool.key].name }}
            </NuxtLink>
         </li>
      </ul>
   </nav>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.tool-nav {
   // Scrolls sideways on narrow screens rather than wrapping into a tall
   // block that pushes the page content below the fold.
   overflow-x: auto;

   &__list {
      display: flex;
      gap: var(--space-2xs);
      list-style: none;
   }

   &__link {
      display: block;
      padding: var(--space-3xs) var(--space-2xs);
      border-radius: var(--radius-sm);
      color: var(--ink-soft);
      font-size: px-to-rem(15);
      white-space: nowrap;

      &:hover {
         background-color: var(--surface-sunken);
         color: var(--ink);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   // Nuxt adds this class to the link matching the current route.
   &__link.router-link-active {
      background-color: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: var(--weight-label);
   }
}
</style>
