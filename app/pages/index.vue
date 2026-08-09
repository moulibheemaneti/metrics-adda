<template>
   <main class="home">
      <h1 class="home__title">
         {{ t("home.heading") }}
      </h1>
      <p class="home__tagline">
         {{ t("home.tagline") }}
      </p>
   </main>
</template>

<script lang="ts" setup>
const { t } = useI18n()

useAppSeo({
   title: t("seo.home.title"),
   description: t("seo.home.description"),
})

// The home title already leads with the brand, and nuxt-seo-utils appends
// the site name by default — which would render "Metrics Adda | Metrics
// Adda". Drop the suffix here only.
useHead({ titleTemplate: "%s" })

defineOgImage("Home", {
   title: t("home.heading"),
   subtitle: t("home.tagline"),
})

useSchemaOrg([
   defineWebSite({ name: "Metrics Adda" }),
   defineWebPage(),
])
</script>

<style scoped lang="scss">
.home {
   display: flex;
   flex-direction: column;
   align-items: center;
   justify-content: center;
   gap: 0.5rem;
   padding: clamp(2rem, 8vw, 5rem) 1.25rem;
   text-align: center;

   &__title {
      font-size: clamp(2rem, 6vw, 3rem);
   }

   &__tagline {
      color: var(--muted);
   }
}
</style>
