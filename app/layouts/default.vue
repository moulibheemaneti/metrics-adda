<template>
   <div class="app-shell">
      <header class="app-shell__topbar">
         <SiteBrand />
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
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-block-end: 1px solid var(--line);
   }
}
</style>
