<template>
   <div class="app-shell">
      <header class="app-shell__topbar">
         <SiteBrand />
         <ToolNav />
         <!-- The toggle's selected option comes from localStorage, which the
              server cannot see, so rendering it during SSR would hydrate
              wrong. The fallback reserves the identical footprint — without
              it the header reflows on hydration, which is precisely the
              layout shift the CLS budget fails builds over. -->
         <ClientOnly>
            <ThemeToggle />
            <template #fallback>
               <div aria-hidden="true" class="app-shell__toggle-placeholder" />
            </template>
         </ClientOnly>
      </header>
      <slot />
      <SiteFooter />
   </div>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.app-shell {
   // Column shell so the footer is pushed to the bottom of short pages
   // instead of floating mid-viewport. The page's <main> takes the slack.
   display: flex;
   flex-direction: column;
   min-block-size: 100dvh;

   :deep(main) {
      flex: 1;
   }

   &__topbar {
      position: sticky;
      inset-block-start: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2xs) var(--space-md);
      padding: var(--space-xs) var(--page-gutter);
      border-block-end: 1px solid var(--line);
      // Translucent over scrolling content. `--surface-veil` carries the
      // alpha; the solid background-color underneath is the fallback for
      // browsers without backdrop-filter, where a 72% veil would let text
      // show through.
      background-color: var(--surface);
      backdrop-filter: blur(12px);
   }

   @supports (backdrop-filter: blur(12px)) {
      &__topbar {
         background-color: var(--surface-veil);
      }
   }

   // Matches ThemeToggle's rendered box: 3px padding + 1px border either
   // side, around a 24px row.
   &__toggle-placeholder {
      block-size: px-to-rem(32);
      inline-size: px-to-rem(232);

      @media (width < 40rem) {
         inline-size: px-to-rem(112);
      }
   }
}
</style>
