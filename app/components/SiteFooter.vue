<template>
   <footer class="site-footer">
      <p class="site-footer__line">
         © {{ year }} {{ COPY.site.name }}. {{ COPY.footer.rights }}
      </p>
      <nav class="site-footer__links" :aria-label="COPY.footer.navLabel">
         <NuxtLink to="/about">
            {{ COPY.footer.about }}
         </NuxtLink>
         <!-- A route rather than the `mailto:` this used to be. Google's
              pre-review checklist asks for a reachable "Contact us" page,
              and a bare `mailto:` is a dead end for anyone reading without
              a mail client configured. The address itself still lives one
              click away, on the page. -->
         <NuxtLink to="/contact">
            {{ COPY.footer.contact }}
         </NuxtLink>
         <NuxtLink to="/privacy-policy">
            {{ COPY.footer.privacy }}
         </NuxtLink>
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
