<template>
   <div class="app-shell">
      <header class="app-shell__topbar">
         <SiteBrand />
         <ToolNav />
      </header>
      <slot />
      <SiteFooter />
   </div>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
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
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2xs) var(--space-md);
      padding: var(--space-xs) var(--page-gutter);
      border-block-end: 1px solid var(--line);
   }
}
</style>
