<template>
   <NuxtLink class="site-brand" to="/">
      {{ COPY.site.name }}
   </NuxtLink>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
.site-brand {
   font-family: var(--font-display);
   font-size: 1.125rem;
   font-weight: var(--weight-heading);
   letter-spacing: 0.01em;
}
</style>
