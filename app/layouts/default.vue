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
         <SiteMenu class="app-shell__menu" />
      </header>
      <slot />
      <!-- After the content, before the footer: the one position on the
           page that can't trigger Google's intrusive-interstitial or
           above-the-fold ad-density treatments. Renders nothing at all
           unless the AdSense env vars are set. -->
      <AdSlot />
      <SiteFooter />
   </div>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

/// The width at which brand, nav and toggle stop competing for one row.
///
/// Measured, not guessed. Brand 127px, toggle 216px, two 24px gaps and two
/// 32px gutters come to 491px of overhead at every width; the nav's four
/// category items measure 455px, so one row needs 946px.
///
/// This was 78rem while the nav listed every tool by name, and by thirteen
/// tools that row was 1940px of links — it overflowed at *every* viewport
/// width, 1920px included. Grouping the tools is what let the figure come
/// down rather than go up: the nav's width is now bounded by the number of
/// categories, which changes about once a year, instead of by the number
/// of tools, which is the thing that grows.
$single-row: 60rem;

/// Below this the nav and the theme control live in the sheet behind the
/// hamburger instead of in the header: at 320px the brand, a hamburger
/// and the toggle already come to more than the 288px available, and the
/// nav needs a row to itself on top of that.
$compact: 40rem;

.app-shell {
   // Column shell so the footer is pushed to the bottom of short pages
   // instead of floating mid-viewport. The page's <main> takes the slack.
   display: flex;
   flex-direction: column;
   min-block-size: 100dvh;

   :deep(main) {
      flex: 1;
   }

   /// The topbar is a grid rather than a wrapping flex row because the
   /// arrangements it needs are different placements of the same items,
   /// not one arrangement that happens to wrap. Left to wrap, a phone got
   /// three stacked rows — brand, nav, toggle — on a sticky header, which
   /// is a lot of viewport spent on chrome. There are three widths:
   ///
   /// - phone: brand and a hamburger, one row. The links and the theme
   ///   control move into the sheet that button opens.
   /// - between: brand and the theme control on one row, the nav on a
   ///   full-width row of its own beneath.
   /// - `$single-row` and up: all three side by side, as before.
   &__topbar {
      position: sticky;
      inset-block-start: 0;
      z-index: 10;
      display: grid;
      grid-template-areas: "brand menu";
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

      @media (width >= $compact) {
         grid-template-areas:
            "brand toggle"
            "nav   nav";
      }

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

   // The nav and the theme control are in the sheet at phone widths, so
   // the header versions are dropped rather than hidden — one copy of
   // each is reachable at any width.
   &__nav,
   &__toggle {
      display: none;
   }

   &__menu {
      grid-area: menu;
      justify-self: end;
   }

   @media (width >= $compact) {
      &__nav {
         display: block;
         grid-area: nav;
         // Grid tracks size to content by default, which would let the nav
         // push the row wider than the viewport instead of scrolling.
         min-inline-size: 0;
      }

      &__toggle {
         display: flex;
         grid-area: toggle;
         justify-self: end;
      }

      &__menu {
         display: none;
      }
   }

   // Centred between the brand and the toggle, as the old space-between
   // row had it.
   @media (width >= $single-row) {
      &__nav {
         justify-self: center;
         max-inline-size: 100%;
      }
   }

   // Matches ThemeToggle's rendered box: 3px padding + 1px border either
   // side, around a 24px row of options. Measured from the mounted
   // control; keep it in step with that padding, or hydration moves the
   // nav sideways under the reader.
   &__toggle-placeholder {
      block-size: px-to-rem(32);
      inline-size: px-to-rem(216);
   }
}
</style>
