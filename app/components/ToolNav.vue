<template>
   <nav
      ref="scroller"
      class="tool-nav"
      :class="{
         'tool-nav--fade-start': fadeStart,
         'tool-nav--fade-end': fadeEnd,
      }"
      :aria-label="COPY.nav.label"
      @scroll.passive="syncFades"
   >
      <ul class="tool-nav__list">
         <li v-for="tool in TOOLS" :key="tool.slug">
            <NuxtLink class="tool-nav__link" :to="tool.path">
               {{ COPY.tools[tool.key].name }}
            </NuxtLink>
         </li>
      </ul>
   </nav>
</template>

<script lang="ts" setup>
/// The tool list is wider than a phone viewport, so this row scrolls
/// sideways. Two things keep that from reading as a truncated list: the
/// current tool is brought into view on load, and the edge the reader can
/// still scroll towards fades out. Both are client-only refinements — the
/// nav is a plain scrollable row without them.

const route = useRoute()
const scroller = useTemplateRef<HTMLElement>("scroller")

const fadeStart = ref(false)
const fadeEnd = ref(false)

/** Fractional scroll offsets are normal; a pixel of slack stops the fades flickering. */
const EDGE_SLACK = 1

function syncFades() {
   const el = scroller.value

   if (!el) return

   fadeStart.value = el.scrollLeft > EDGE_SLACK
   fadeEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_SLACK
}

/**
 * Centres the link for the current route in the scroller.
 *
 * Measured from the rendered boxes rather than `offsetLeft`, which is
 * relative to the nearest positioned ancestor — the sticky header, not
 * this element. `scrollIntoView()` would do the centring itself but is
 * free to scroll the page along with it.
 */
function revealActiveLink() {
   const el = scroller.value
   const active = el?.querySelector(".tool-nav__link.router-link-active")

   if (!el || !active) return

   const track = el.getBoundingClientRect()
   const link = active.getBoundingClientRect()

   el.scrollLeft += link.left - track.left - (track.width - link.width) / 2
   syncFades()
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
   revealActiveLink()

   // The fades depend on how much of the row fits, so they have to be
   // recomputed on rotation and on any resize that changes the header.
   if (typeof ResizeObserver === "undefined" || !scroller.value) return

   resizeObserver = new ResizeObserver(syncFades)
   resizeObserver.observe(scroller.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())

// Navigating between tools swaps the active link without remounting the
// nav, so the centring has to run again once the class has moved.
watch(() => route.path, () => nextTick(revealActiveLink))
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.tool-nav {
   // Scrolls sideways on narrow screens rather than wrapping into a tall
   // block that pushes the page content below the fold.
   --tool-nav-fade-width: #{px-to-rem(28)};
   --tool-nav-fade-start: 0;
   --tool-nav-fade-end: 0;

   overflow-x: auto;
   // The fades stand in for the scrollbar: a permanent bar under a single
   // row of links reads as a stray rule across the header.
   scrollbar-width: none;
   // Both ends collapse to zero width when there is nothing to scroll to,
   // which leaves the gradient a no-op.
   mask-image: linear-gradient(
      to right,
      transparent 0,
      #000000 var(--tool-nav-fade-start),
      #000000 calc(100% - var(--tool-nav-fade-end)),
      transparent 100%
   );

   &::-webkit-scrollbar {
      display: none;
   }

   &--fade-start {
      --tool-nav-fade-start: var(--tool-nav-fade-width);
   }

   &--fade-end {
      --tool-nav-fade-end: var(--tool-nav-fade-width);
   }

   &__list {
      display: flex;
      gap: var(--space-2xs);
      list-style: none;
   }

   &__link {
      display: block;
      padding: var(--space-3xs) var(--space-2xs);
      border-radius: var(--radius-sm);
      color: var(--ink-soft);
      font-size: px-to-rem(15);
      white-space: nowrap;

      &:hover {
         background-color: var(--surface-sunken);
         color: var(--ink);
      }

      // Drawn inside the link rather than around it: a scroll container
      // clips whatever sits outside its padding box, which took the top
      // and bottom off an outset ring.
      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: -2px;
      }

      // Thumb-sized targets once the nav is the only thing on its row.
      // The tighter line-height keeps the taller padding from turning the
      // row into a third of the header.
      @media (width < 40rem) {
         padding: var(--space-2xs) var(--space-xs);
         line-height: 1.2;
      }
   }

   // Nuxt adds this class to the link matching the current route.
   &__link.router-link-active {
      background-color: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: var(--weight-label);
   }
}
</style>
