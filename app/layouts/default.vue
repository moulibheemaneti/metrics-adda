<template>
   <div class="app-shell">
      <header class="app-shell__topbar">
         <SiteBrand class="app-shell__brand" />
         <ToolNav class="app-shell__nav" />
         <!-- The toggle's selected option comes from localStorage, which the
              server cannot see, so rendering it during SSR would hydrate
              wrong. The fallback reserves the identical footprint — without
              it the header reflows on hydration, which is precisely the
              layout shift the CLS budget fails builds over. -->
         <ClientOnly>
            <ThemeToggle class="app-shell__toggle" />
            <template #fallback>
               <div aria-hidden="true" class="app-shell__toggle app-shell__toggle-placeholder" />
            </template>
         </ClientOnly>
      </header>
      <slot />
      <SiteFooter />
   </div>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

/// The width at which brand, nav and toggle stop competing for one row.
/// Measured, not guessed: the nav's five links come to 770px, the brand to
/// 127px and the toggle to 216px, plus two 24px gaps and two 32px gutters —
/// 1225px before anything has to give. Below this the header splits into
/// two rows rather than squeezing the nav into whatever is left over.
$single-row: 78rem;

.app-shell {
   // Column shell so the footer is pushed to the bottom of short pages
   // instead of floating mid-viewport. The page's <main> takes the slack.
   display: flex;
   flex-direction: column;
   min-block-size: 100dvh;

   :deep(main) {
      flex: 1;
   }

   /// The topbar is a grid rather than a wrapping flex row because the two
   /// layouts it needs are different arrangements of the same three items,
   /// not one arrangement that happens to wrap. Left to wrap, a phone got
   /// three stacked rows — brand, nav, toggle — on a sticky header, which
   /// is a lot of viewport spent on chrome. Pairing the brand with the
   /// toggle buys the nav a full-width row of its own to scroll in.
   &__topbar {
      position: sticky;
      inset-block-start: 0;
      z-index: 10;
      display: grid;
      grid-template-areas:
         "brand toggle"
         "nav   nav";
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: var(--space-2xs) var(--space-md);
      padding: var(--space-2xs) var(--page-gutter);
      border-block-end: 1px solid var(--line);
      // Translucent over scrolling content. `--surface-veil` carries the
      // alpha; the solid background-color underneath is the fallback for
      // browsers without backdrop-filter, where a 72% veil would let text
      // show through.
      background-color: var(--surface);
      backdrop-filter: blur(12px);

      @media (width >= $single-row) {
         grid-template-areas: "brand nav toggle";
         grid-template-columns: auto 1fr auto;
         padding-block: var(--space-xs);
      }
   }

   @supports (backdrop-filter: blur(12px)) {
      &__topbar {
         background-color: var(--surface-veil);
      }
   }

   &__brand {
      grid-area: brand;
   }

   &__nav {
      grid-area: nav;
      // Grid tracks size to content by default, which would let the nav
      // push the row wider than the viewport instead of scrolling.
      min-inline-size: 0;

      // Full-bleed on its own row: the links run to the screen edges, so a
      // half-visible link reads as "there is more this way" rather than as
      // something clipped by a stray container.
      @media (width < 40rem) {
         margin-inline: calc(var(--page-gutter) * -1);
         padding-inline: var(--page-gutter);
      }

      // Centred between the brand and the toggle, as the old space-between
      // row had it. The cap is what keeps a nav too wide for the middle
      // column scrolling inside it instead of overflowing both ways and
      // printing itself over its neighbours.
      @media (width >= $single-row) {
         justify-self: center;
         max-inline-size: 100%;
      }
   }

   &__toggle {
      grid-area: toggle;
      justify-self: end;
   }

   // Matches ThemeToggle's rendered box: 3px padding + 1px border either
   // side, around a 24px row of labelled options — or a 28px row of 40px
   // icon-only targets once the labels drop off below 40rem. Both figures
   // are measured from the mounted control; keep them in step with its
   // padding, or hydration moves the nav sideways under the reader.
   &__toggle-placeholder {
      block-size: px-to-rem(32);
      inline-size: px-to-rem(216);

      @media (width < 40rem) {
         block-size: px-to-rem(36);
         inline-size: px-to-rem(132);
      }
   }
}
</style>
