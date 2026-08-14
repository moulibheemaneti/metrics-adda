<template>
   <svg
      aria-hidden="true"
      class="nav-chevron"
      viewBox="0 0 10 6"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
   >
      <path d="M1 1.25 5 4.75 9 1.25" />
   </svg>
</template>

<script lang="ts" setup>
/// The mark on anything that opens a list of tools.
///
/// An SVG rather than "▾": that glyph sits low in its em box, so rotating
/// it 180deg swings the visible mark to the top of the line instead of
/// flipping it in place.
///
/// The rotation itself belongs to the caller, because what counts as open
/// differs — a button says so with `aria-expanded`, a `<details>` with its
/// own `open` attribute — and neither is visible from in here.
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.nav-chevron {
   // Sized here rather than by the caller so the box stays symmetrical
   // about its own centre, which is what `rotate` turns around.
   inline-size: px-to-rem(10);
   block-size: px-to-rem(6);
   transition: rotate var(--duration) var(--ease);
}
</style>
