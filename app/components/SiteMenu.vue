<template>
   <div class="site-menu">
      <button
         class="site-menu__trigger"
         type="button"
         :aria-label="COPY.nav.menu"
         aria-haspopup="dialog"
         @click="open"
      >
         <span aria-hidden="true" class="site-menu__bars" />
      </button>

      <dialog ref="sheet" class="site-menu__sheet" @click="closeOnScrim" @close="onClose">
         <div class="site-menu__panel">
            <div class="site-menu__head">
               <h2 class="site-menu__title">
                  {{ COPY.nav.menuHeading }}
               </h2>
               <button class="site-menu__close" type="button" :aria-label="COPY.nav.close" @click="close">
                  <span aria-hidden="true">✕</span>
               </button>
            </div>

            <nav :aria-label="COPY.nav.label">
               <ul class="site-menu__list">
                  <li v-for="tool in TOOLS" :key="tool.slug">
                     <NuxtLink class="site-menu__link" :to="tool.path">
                        {{ COPY.tools[tool.key].name }}
                     </NuxtLink>
                  </li>
               </ul>
            </nav>

            <!-- Same reason as the header copy: the stored preference is
                 invisible to the server, so this renders after hydration.
                 No placeholder needed — the sheet is closed at that point. -->
            <ClientOnly>
               <ThemeToggle class="site-menu__theme" />
            </ClientOnly>
         </div>
      </dialog>
   </div>
</template>

<script lang="ts" setup>
/// The phone-width navigation: a hamburger opening a side sheet.
///
/// Built on <dialog> rather than a div, which is what makes the focus
/// trap, Escape to close, the inert page behind and the return of focus
/// to the trigger browser behaviour instead of hand-written code.

const route = useRoute()
const sheet = useTemplateRef<HTMLDialogElement>("sheet")

function open() {
   sheet.value?.showModal()
   // A modal dialog leaves the page behind scrollable in some browsers,
   // which drags the sheet's backdrop around with it.
   document.documentElement.style.overflow = "hidden"
}

function close() {
   sheet.value?.close()
}

function onClose() {
   document.documentElement.style.overflow = ""
}

/** Clicks land on the dialog itself only outside the panel — the scrim. */
function closeOnScrim(event: MouseEvent) {
   if (event.target === sheet.value) close()
}

// Picking a tool navigates without unmounting the sheet.
watch(() => route.path, close)

onBeforeUnmount(onClose)
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.site-menu {
   &__trigger {
      display: grid;
      place-items: center;
      inline-size: px-to-rem(40);
      block-size: px-to-rem(40);
      border-radius: var(--radius-sm);
      color: var(--ink);
      cursor: pointer;

      &:hover {
         background-color: var(--surface-sunken);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   // Three rules drawn from one element: the bar itself plus its two
   // pseudo-elements. Cheaper than an icon file, and it inherits `color`.
   &__bars,
   &__bars::before,
   &__bars::after {
      display: block;
      inline-size: px-to-rem(18);
      block-size: px-to-rem(2);
      border-radius: var(--radius-pill);
      background-color: currentcolor;
   }

   &__bars {
      position: relative;

      &::before,
      &::after {
         position: absolute;
         content: "";
      }

      &::before {
         inset-block-start: px-to-rem(-6);
      }

      &::after {
         inset-block-start: px-to-rem(6);
      }
   }

   /// The dialog covers the viewport and the panel inside it is the sheet,
   /// so a click anywhere outside the panel is a click on the dialog —
   /// which is what `closeOnScrim` tests for.
   &__sheet {
      max-inline-size: none;
      max-block-size: none;
      inline-size: 100%;
      block-size: 100%;
      border: 0;
      background: none;

      &::backdrop {
         background-color: rgb(11 16 32 / 48%);
         backdrop-filter: blur(2px);
      }
   }

   &__panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin-inline-start: auto;
      inline-size: min(#{px-to-rem(320)}, 82vw);
      block-size: 100%;
      padding: var(--space-sm);
      border-inline-start: 1px solid var(--line);
      background-color: var(--surface);
      box-shadow: var(--shadow-lg);
      overflow-y: auto;
      // Slides in from the edge it is anchored to. Only the opening half
      // is animated — the dialog is display:none the moment it closes —
      // and where @starting-style is unsupported the sheet just appears.
      transition: translate var(--duration) var(--ease);

      @starting-style {
         translate: 100% 0;
      }
   }

   &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
   }

   &__title {
      font-size: px-to-rem(15);
      font-weight: var(--weight-label);
      letter-spacing: 0.04em;
      color: var(--muted);
      text-transform: uppercase;
   }

   &__close {
      display: grid;
      place-items: center;
      inline-size: px-to-rem(36);
      block-size: px-to-rem(36);
      border-radius: var(--radius-sm);
      color: var(--muted);
      cursor: pointer;

      &:hover {
         background-color: var(--surface-sunken);
         color: var(--ink);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   &__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
      list-style: none;
   }

   &__link {
      display: block;
      padding: var(--space-2xs) var(--space-xs);
      border-radius: var(--radius-sm);
      color: var(--ink-soft);

      &:hover {
         background-color: var(--surface-sunken);
         color: var(--ink);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   &__link.router-link-active {
      background-color: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: var(--weight-label);
   }

   // The theme control sits at the foot of the sheet on phones, which is
   // the only place it appears at this width — see `layouts/default.vue`.
   &__theme {
      margin-block-start: auto;
      align-self: flex-start;
   }
}
</style>
