<template>
   <!-- Emits <link rel="manifest">, and nothing else — the component renders
        null. It is not injected automatically: without it the service worker
        still installs, but the browser has no manifest to read and the site
        is not installable. Auto-imported by @vite-pwa/nuxt. -->
   <VitePwaManifest />
   <NuxtLayout>
      <NuxtPage />
   </NuxtLayout>
</template>
