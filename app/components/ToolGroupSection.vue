<template>
   <section :id="sectionId" class="tool-group stack stack--tight" :aria-labelledby="headingId">
      <div class="tool-group__header">
         <component :is="heading" :id="headingId" :class="headingClass">
            <NuxtLink v-if="hubLink" class="tool-group__hub" :to="hubLink">
               {{ copy.heading }}
               <!-- Without this the four linked headings are indistinguishable
                    from the two unlinked ones, and a link nobody can see is a
                    link nobody follows. Same glyph the tool cards use. -->
               <span aria-hidden="true" class="tool-group__hub-arrow">→</span>
            </NuxtLink>
            <template v-else>
               {{ copy.heading }}
            </template>
         </component>
         <p class="tool-group__lede">
            {{ copy.lede }}
         </p>
      </div>
      <!-- `--fill` rather than the bare grid: `health` and `security` hold
           one tool each, and an auto-fit track with a single item in it
           stretches that card across the full page width. -->
      <ul class="card-grid card-grid--fill">
         <li v-for="tool in shown" :key="tool.slug">
            <ToolCard :tool="tool" />
         </li>
      </ul>
      <p v-if="overflow" class="tool-group__more">
         <NuxtLink class="tool-group__more-link" :to="overflow.to">
            {{ overflow.label }}
            <span aria-hidden="true">→</span>
         </NuxtLink>
      </p>
   </section>
</template>

<script lang="ts" setup>
/// One tool category, as a heading, a line of prose and its cards.
///
/// Rendered twice over: as a section of the home page, where the heading
/// is an <h2> among six, and as the whole of that category's hub page,
/// where the same heading is the <h1>. Keeping both in one component is
/// what stops a hub page from becoming a second copy of this markup to
/// keep in step — and `COPY.groups` means they cannot disagree about what
/// a category is called either.

import type { ToolGroup } from "~/utils/tools"

const props = withDefaults(defineProps<{
   group: ToolGroup
   /// `h1` on a hub page, where this section is the page. The default
   /// suits the home page, where the hero already holds the <h1>.
   heading?: "h1" | "h2"
   /// Cap the cards shown, with a link to the group's hub for the rest.
   /// Unset shows everything, which is what a hub page wants — it is the
   /// page the link would point at.
   limit?: number
}>(), {
   heading: "h2",
   limit: undefined,
})

/// Deterministic rather than `useId()`, unlike `ToolNav.vue`: the chip row
/// on the home page links to this anchor, so the id has to be knowable by
/// something that is not this component instance. `groupSectionId` is
/// where both sides read it from.
const sectionId = computed(() => groupSectionId(props.group))
const headingId = computed(() => `${sectionId.value}-heading`)

/// A hub page's heading is the page's title and takes the size every
/// other page's <h1> has; on the home page it is one of six section
/// headings. Same element either way, so the level and the size are set
/// by the same prop rather than left to the caller to keep in step.
const headingClass = computed(() =>
   props.heading === "h1" ? "page-header__title" : "section-heading")

const copy = computed(() => COPY.groups[props.group])
const tools = computed(() => toolsByGroup(props.group))

/**
 * The heading links to the group's hub — and this, not the overflow link
 * below, is what gives every hub an inbound link from the home page.
 *
 * Only as an `h2`. As an `h1` this section *is* the hub page, and a
 * heading linking to the page it already sits on is a dead control that
 * reads as a real one.
 */
const hubLink = computed(() =>
   props.heading === "h2" && isHubGroup(props.group) ? hubPath(props.group) : null)

/**
 * Cards shown, which is every card unless a `limit` says otherwise —
 * and even then, never trimmed to hide a single card.
 *
 * Nine of ten groups on this site are small, so a bare slice would turn
 * "show 3" into "hide 1" on a four-tool group: a whole extra row of link
 * and whitespace to save one card, and a reader sent to another page for
 * something that would have fitted. Trimming has to save more than it
 * costs, and at one card it does not.
 */
const shown = computed(() => {
   const { limit } = props

   if (limit === undefined || tools.value.length <= limit + 1) return tools.value

   return tools.value.slice(0, limit)
})

/**
 * The overflow link, or `null` when there is nothing to link to.
 *
 * Three conditions, and the third is the one that is easy to miss: a
 * group can only overflow *somewhere* if it has a hub page, and
 * `GROUP_ROUTES` deliberately omits the single-tool groups. Passing a
 * `limit` to one of those is not an error worth throwing over — it just
 * shows every card, which is what it was already doing.
 */
const overflow = computed(() => {
   const { group } = props
   const hidden = tools.value.length - shown.value.length

   if (hidden <= 0 || !isHubGroup(group)) return null

   return {
      to: hubPath(group),
      label: COPY.common.seeAll
         .replace("{count}", String(tools.value.length))
         .replace("{plural}", copy.value.plural),
   }
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.tool-group {
   /// The chip row jumps here, and the header is sticky, so an untreated
   /// anchor lands with the heading underneath it. Measured rather than
   /// guessed: the topbar is 57px at every width except between 40rem and
   /// 60rem, where the nav takes a second row and it becomes 88px. The
   /// breakpoints are `$compact` and `$single-row` in `layouts/default.vue`,
   /// written as literals here for the same reason `_card.scss` does.
   scroll-margin-block-start: calc(#{px-to-rem(57)} + var(--space-sm));

   @media (width >= 40rem) and (width < 60rem) {
      scroll-margin-block-start: calc(#{px-to-rem(88)} + var(--space-sm));
   }

   /// Heading and lede belong together more closely than either belongs to
   /// the cards, so they take the tighter gap `.page-header` uses for the
   /// same pairing on a tool page.
   &__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
   }

   &__lede {
      max-inline-size: var(--measure);
      color: var(--ink-soft);
      font-size: px-to-rem(15);
      line-height: 1.6;
   }

   /// The heading's link is the heading — no colour of its own, so the
   /// section still reads as a heading rather than as a row of link text.
   /// The underline on hover is what marks it as one.
   &__hub {
      color: inherit;

      &:hover .tool-group__hub-arrow {
         transform: translateX(2px);
      }

      &:hover {
         text-decoration: underline;
         text-decoration-thickness: 1px;
         text-underline-offset: 3px;
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 3px;
         border-radius: var(--radius-sm);
      }
   }

   &__hub-arrow {
      display: inline-block;
      color: var(--accent);
      font-size: px-to-rem(15);
      transition: transform var(--duration) var(--ease);
   }

   &__more-link {
      color: var(--accent);
      font-size: px-to-rem(15);
      font-weight: var(--weight-label);

      &:hover {
         text-decoration: underline;
      }

      &:focus-visible {
         outline: 2px solid var(--accent);
         outline-offset: 2px;
         border-radius: var(--radius-sm);
      }
   }
}
</style>
