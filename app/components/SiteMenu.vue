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

            <!-- Collapsed the same way the header nav is, so the site has
                 one shape rather than a different one per viewport. Flat,
                 the list was fifteen equal-weight links a screen and a half
                 tall, with no way to tell the eight converters from the
                 rest and Health only reachable by scrolling. -->
            <nav :aria-label="COPY.nav.label">
               <ul class="site-menu__groups">
                  <li v-for="group in groups" :key="group.id">
                     <!-- Same rule as the header: a group holding one tool
                          is that tool. -->
                     <NuxtLink v-if="group.only" class="site-menu__link" :to="group.only.path">
                        {{ COPY.tools[group.only.key].name }}
                     </NuxtLink>

                     <!-- <details> rather than the header's hand-rolled
                          disclosure. It brings its own expanded state,
                          keyboard behaviour and — via `name` — the header's
                          one-open-at-a-time rule, none of which needs
                          script here. Where `name` is unsupported the
                          groups simply open independently. -->
                     <details
                        v-else
                        class="site-menu__group"
                        name="site-menu-group"
                        :open="openGroup === group.id"
                        @toggle="onToggle(group.id, $event)"
                     >
                        <summary
                           class="site-menu__summary"
                           :class="{ 'site-menu__summary--current': group.id === currentGroup }"
                        >
                           <h3 class="site-menu__group-title">
                              {{ group.label }}
                           </h3>
                           <NavChevron class="site-menu__chevron" />
                        </summary>

                        <ul class="site-menu__list">
                           <li v-for="tool in group.tools" :key="tool.slug">
                              <NuxtLink class="site-menu__link" :to="tool.path">
                                 {{ COPY.tools[tool.key].name }}
                              </NuxtLink>
                           </li>
                        </ul>
                     </details>
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
/// to the trigger browser behaviour instead of hand-written code — and on
/// <details> inside it for the same reason.

const route = useRoute()
const sheet = useTemplateRef<HTMLDialogElement>("sheet")

const groups = useToolGroups()
const currentGroup = useCurrentToolGroup()

/// The group the current page belongs to starts open, so the sheet opens
/// showing where you are rather than five shut rows. Everything else
/// starts closed, which is the point: the whole site fits on one screen
/// without scrolling, and the tool you came for is already on it.
///
/// This is derived from the route on the server too, so the open group is
/// in the server-rendered HTML and hydration has nothing to correct.
const openGroup = ref<ToolGroup | null>(currentGroup.value)

/**
 * Follow the DOM rather than drive it.
 *
 * `name` makes the browser close the previously open group by itself, so
 * that close arrives here as a second `toggle` event rather than as
 * something to arrange. Tracking what the browser did — instead of
 * assuming a click means one open and one shut — is what keeps `:open`
 * agreeing with the elements when the two events land in either order.
 */
function onToggle(group: ToolGroup, event: Event) {
   const details = event.target

   if (!(details instanceof HTMLDetailsElement)) return

   if (details.open) openGroup.value = group
   else if (openGroup.value === group) openGroup.value = null
}

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

// Picking a tool navigates without unmounting the sheet. Reopening it on
// the new page should show that page's group, not the last one opened by
// hand — the sheet is a place you pass through, not a state you maintain.
watch(() => route.path, () => {
   close()
   openGroup.value = currentGroup.value
})

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

   &__groups {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
      list-style: none;
   }

   /// The row that opens a group. `list-style: none` is what removes the
   /// default disclosure triangle in every current browser — the
   /// `::-webkit-details-marker` rule below covers the older Safaris that
   /// ignore it — and it goes here rather than on `summary` bare so the
   /// single-tool groups, which are plain links, keep their own shape.
   &__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2xs);
      padding: var(--space-2xs) var(--space-xs);
      border-radius: var(--radius-sm);
      color: var(--ink-soft);
      cursor: pointer;
      list-style: none;

      &::-webkit-details-marker {
         display: none;
      }

      &:hover {
         background-color: var(--surface-sunken);
         color: var(--ink);
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   // Matches the header's `--current`: with one group open at a time, a
   // shut group is the only thing left saying which section you are in.
   &__summary--current {
      color: var(--accent-strong);
   }

   &__chevron {
      color: var(--muted);

      .site-menu__group[open] & {
         rotate: 180deg;
      }
   }

   /// Set in the same type as a tool link rather than as a small-caps
   /// section label, which is what it used to be.
   ///
   /// Collapsing is what forces this. A category is now a control sitting
   /// in a row of controls — some of which are the single-tool groups,
   /// and those are tool names, which cannot be uppercased. Left as
   /// headers, the two weights inverted: "Password Generator" outweighed
   /// the "GENERATORS" above it and read as its contents. The header nav
   /// has always drawn both from one `.tool-nav__link`; this is the same
   /// arrangement, and the chevron is what marks which rows expand.
   &__group-title {
      color: inherit;
      font-size: inherit;
      font-weight: var(--weight-label);
   }

   &__list {
      display: flex;
      flex-direction: column;
      gap: var(--space-3xs);
      // Indented behind a rule, so a group's tools are unmistakably
      // inside it rather than more rows after it — the distinction the
      // uppercase titles used to carry on their own.
      margin-block-start: var(--space-3xs);
      margin-inline-start: var(--space-xs);
      padding-inline-start: var(--space-2xs);
      border-inline-start: 1px solid var(--line);
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
