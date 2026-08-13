<template>
   <nav
      ref="root"
      class="tool-nav"
      :aria-label="COPY.nav.label"
      @focusout="closeOnLeave"
      @keydown.esc="closeAndRestore"
   >
      <ul class="tool-nav__list">
         <li v-for="group in groups" :key="group.id" class="tool-nav__group">
            <!-- A group holding one tool is that tool. A dropdown wrapping a
                 single item is friction with nothing behind it. -->
            <NuxtLink v-if="group.only" class="tool-nav__link" :to="group.only.path">
               {{ COPY.tools[group.only.key].name }}
            </NuxtLink>

            <template v-else>
               <button
                  :id="`${uid}-${group.id}-trigger`"
                  :ref="(el) => setTrigger(group.id, el)"
                  class="tool-nav__link tool-nav__trigger"
                  :class="{ 'tool-nav__trigger--current': group.id === currentGroup }"
                  type="button"
                  :aria-expanded="open === group.id"
                  :aria-controls="`${uid}-${group.id}-panel`"
                  @click="toggle(group.id)"
               >
                  {{ group.label }}
                  <!-- An SVG rather than "▾": that glyph sits low in its em
                       box, so rotating it 180deg swings the visible mark to
                       the top of the line instead of flipping it in place. -->
                  <svg
                     aria-hidden="true"
                     class="tool-nav__chevron"
                     viewBox="0 0 10 6"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="1.5"
                     stroke-linecap="round"
                     stroke-linejoin="round"
                  >
                     <path d="M1 1.25 5 4.75 9 1.25" />
                  </svg>
               </button>

               <!-- Rendered whether open or not, and hidden with CSS. These
                    are the site's internal links; mounting them on click
                    would take them out of the server-rendered HTML. -->
               <ul
                  v-show="open === group.id"
                  :id="`${uid}-${group.id}-panel`"
                  class="tool-nav__panel"
               >
                  <li v-for="tool in group.tools" :key="tool.slug">
                     <NuxtLink class="tool-nav__item" :to="tool.path">
                        {{ COPY.tools[tool.key].name }}
                     </NuxtLink>
                  </li>
               </ul>
            </template>
         </li>
      </ul>
   </nav>
</template>

<script lang="ts" setup>
/// The header navigation: one row of categories, each opening a list.
///
/// This replaced a single scrolling row of every tool. Thirteen names came
/// to 1940px of links, which overflowed at every viewport width including
/// 1920px, and the fades and auto-centring that softened it were treating
/// the symptom. Four top-level items come to roughly 450px and fit on one
/// row with room to spare, and they keep fitting as tools land — the
/// registry decides how deep each list is, not the header's width.
///
/// Built from `toolsByGroup`, which until now was called only by tests.
///
/// A disclosure, deliberately not `role="menu"`. That role is for
/// application menus and makes a screen reader announce these as
/// menuitems, which loses the one thing they are: links to pages.

const route = useRoute()
const uid = useId()
const root = useTemplateRef<HTMLElement>("root")

const open = ref<ToolGroup | null>(null)

/// Triggers are collected by group so Escape can hand focus back to the
/// one that opened the panel.
const triggers = new Map<ToolGroup, HTMLElement>()

function setTrigger(group: ToolGroup, el: Element | ComponentPublicInstance | null) {
   if (el instanceof HTMLElement) triggers.set(group, el)
   else triggers.delete(group)
}

const groups = computed(() =>
   TOOL_GROUPS
      .map((id) => {
         const tools = toolsByGroup(id)

         return {
            id,
            label: COPY.nav.groups[id],
            tools,
            only: tools.length === 1 ? tools[0] : undefined,
         }
      })
      .filter((group) => group.tools.length > 0))

/** The group the current page belongs to, so its trigger reads as active. */
const currentGroup = computed(() =>
   TOOLS.find((tool) => tool.path === route.path)?.group ?? null)

function toggle(group: ToolGroup) {
   open.value = open.value === group ? null : group
}

function closeAndRestore() {
   const trigger = open.value === null ? null : triggers.get(open.value)

   open.value = null
   trigger?.focus()
}

/**
 * Close once focus leaves the group that is open.
 *
 * Scoped to the group rather than to the whole nav, which is the
 * difference between tabbing off the end of a panel and landing on the
 * next category with the previous panel still hanging open under it.
 *
 * This is most of the dismissal behaviour on its own: tabbing past the
 * last link moves focus to the next trigger, and clicking a non-focusable
 * part of the page blurs the trigger with a null `relatedTarget`. Clicking
 * a sibling trigger closes here and reopens on the click that follows,
 * because `focusout` runs first.
 */
function closeOnLeave(event: FocusEvent) {
   if (open.value === null) return

   const group = triggers.get(open.value)?.closest(".tool-nav__group")
   const next = event.relatedTarget

   if (next instanceof Node && group?.contains(next)) return

   open.value = null
}

function closeOnOutsidePointer(event: PointerEvent) {
   if (event.target instanceof Node && root.value?.contains(event.target)) return

   open.value = null
}

onMounted(() => document.addEventListener("pointerdown", closeOnOutsidePointer))
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeOnOutsidePointer))

// Picking a tool navigates without unmounting the nav, so the open panel
// would otherwise stay open over the page it just moved to.
watch(() => route.path, () => {
   open.value = null
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.tool-nav {
   // No `overflow` here. The panels are positioned out of the row, and a
   // scroll container clips anything outside its padding box — which is
   // what the previous version had to be, and why it could not have had a
   // dropdown at all.
   &__list {
      display: flex;
      gap: var(--space-3xs);
      list-style: none;
   }

   &__group {
      position: relative;
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

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
      }
   }

   &__trigger {
      display: inline-flex;
      gap: var(--space-3xs);
      align-items: center;
      cursor: pointer;

      &[aria-expanded="true"] {
         background-color: var(--surface-sunken);
         color: var(--ink);
      }
   }

   &__chevron {
      // Sized here rather than in the markup so the box stays symmetrical
      // about its own centre, which is what `rotate` turns around.
      inline-size: px-to-rem(10);
      block-size: px-to-rem(6);
      transition: rotate var(--duration) var(--ease);

      .tool-nav__trigger[aria-expanded="true"] & {
         rotate: 180deg;
      }
   }

   // Nuxt adds this class to the link matching the current route; the
   // trigger gets the equivalent by hand, since a category is not a route.
   &__link.router-link-active,
   &__trigger--current {
      background-color: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: var(--weight-label);
   }

   &__panel {
      position: absolute;
      inset-block-start: calc(100% + var(--space-3xs));
      inset-inline-start: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: px-to-rem(2);
      // Wide enough for the longest tool name without wrapping, and capped
      // so it cannot run off a narrow viewport.
      min-inline-size: px-to-rem(220);
      max-inline-size: min(#{px-to-rem(280)}, 80vw);
      padding: var(--space-3xs);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background-color: var(--surface);
      box-shadow: var(--shadow-lg);
      list-style: none;
   }

   // The last group sits at the right-hand end of the row, where a panel
   // anchored to its left edge would hang off the viewport.
   &__group:last-child &__panel {
      inset-inline-start: auto;
      inset-inline-end: 0;
   }

   &__item {
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

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: -2px;
      }
   }

   &__item.router-link-active {
      background-color: var(--accent-soft);
      color: var(--accent-strong);
      font-weight: var(--weight-label);
   }
}
</style>
