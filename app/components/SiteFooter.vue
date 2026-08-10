<template>
   <footer class="site-footer">
      <p class="site-footer__line">
         © {{ year }} {{ COPY.site.name }}. {{ COPY.footer.rights }}
      </p>
      <nav class="site-footer__links" :aria-label="COPY.footer.navLabel">
         <NuxtLink to="/privacy-policy">
            {{ COPY.footer.privacy }}
         </NuxtLink>
         <a :href="`mailto:${SITE_EMAIL}`">
            {{ COPY.footer.contact }}
         </a>
      </nav>
   </footer>
</template>

<script lang="ts" setup>
// Rendered on the server first, so this is the deploy's year on a cached
// page — close enough for a copyright line, and it avoids a hydration
// mismatch from computing it twice.
const year = new Date().getFullYear()
</script>

<style scoped lang="scss">
.site-footer {
   display: flex;
   flex-wrap: wrap;
   align-items: center;
   justify-content: space-between;
   gap: 0.75rem;
   padding: 1.5rem 1.25rem;
   border-block-start: 1px solid var(--line);
   color: var(--muted);
   font-size: 0.9rem;

   &__links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);

      a {
         color: var(--accent);
      }
   }
}
</style>
