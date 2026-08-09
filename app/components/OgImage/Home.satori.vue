<template>
   <div class="og">
      <div class="og__glow" />
      <div class="og__brand">
         <span class="og__mark" />
         Metrics Adda
      </div>
      <div class="og__title">
         {{ title }}
      </div>
      <div class="og__subtitle">
         {{ subtitle }}
      </div>
   </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
   title?: string
   subtitle?: string
}>(), {
   title: "Metrics Adda",
   subtitle: "Fast, free converters and text tools.",
})
</script>

<style scoped>
/* Inline, self-contained styles. Satori renders only a subset of CSS —
   flexbox, no grid — and resolves neither SCSS nor the :root custom
   properties the site uses, so the palette is repeated literally. These
   hex values mirror --ink, --accent and --gradient-brand in
   assets/scss/base/_global.scss; change them together. */
.og {
   position: relative;
   width: 100%;
   height: 100%;
   display: flex;
   flex-direction: column;
   justify-content: center;
   padding: 80px;
   background-color: #0b1020;
   color: #ffffff;
   font-family: sans-serif;
}

/* Pushed well off-canvas on purpose: Satori has no blur, so a circle
   sitting fully in frame reads as a hard disc rather than a glow — only
   an arc of it should be visible. */
.og__glow {
   position: absolute;
   top: -340px;
   right: -280px;
   width: 800px;
   height: 800px;
   border-radius: 800px;
   background-image: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
   opacity: 0.42;
}

.og__brand {
   display: flex;
   align-items: center;
   font-size: 30px;
   font-weight: 700;
   letter-spacing: 2px;
   text-transform: uppercase;
   opacity: 0.92;
   margin-bottom: 32px;
}

.og__mark {
   width: 18px;
   height: 18px;
   border-radius: 6px;
   margin-right: 14px;
   background-image: linear-gradient(135deg, #818cf8 0%, #c4b5fd 100%);
}

.og__title {
   font-size: 76px;
   font-weight: 800;
   line-height: 1.03;
   letter-spacing: -2px;
}

.og__subtitle {
   font-size: 34px;
   font-weight: 400;
   margin-top: 24px;
   opacity: 0.78;
}
</style>
