<template>
   <NuxtLink class="site-brand" :to="localePath('/')">
      {{ t("site.name") }}
   </NuxtLink>
</template>

<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<style scoped lang="scss">
.site-brand {
   font-family: var(--font-display);
   font-size: 1.125rem;
   font-weight: var(--weight-heading);
   letter-spacing: 0.01em;
}
</style>
