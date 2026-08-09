<template>
   <NuxtLink class="site-brand" to="/">
      <!-- Decorative: the site name sits right beside it, so an alt text
           would only make a screen reader read the brand out twice. Width
           and height are intrinsic so the header reserves the box before
           the file arrives — the sticky topbar is in the CLS budget. -->
      <NuxtImg
         alt=""
         aria-hidden="true"
         class="site-brand__mark"
         format="webp"
         height="28"
         src="/logo.png"
         width="28"
      />
      <span>{{ COPY.site.name }}</span>
   </NuxtLink>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
.site-brand {
   display: inline-flex;
   align-items: center;
   gap: var(--space-2xs);
   font-family: var(--font-display);
   font-size: 1.125rem;
   font-weight: var(--weight-heading);
   letter-spacing: 0.01em;

   &__mark {
      display: block;
      flex-shrink: 0;
      block-size: 1.75rem;
      inline-size: 1.75rem;
   }
}
</style>
