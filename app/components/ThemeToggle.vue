<template>
   <fieldset class="theme-toggle">
      <legend class="visually-hidden">
         {{ COPY.theme.legend }}
      </legend>

      <label
         v-for="option in THEME_PREFERENCES"
         :key="option"
         class="theme-toggle__option"
         :class="{ 'theme-toggle__option--active': preference === option }"
      >
         <input
            class="theme-toggle__input visually-hidden"
            type="radio"
            :name="`${uid}-theme`"
            :value="option"
            :checked="preference === option"
            @change="setTheme(option)"
         />
         <span aria-hidden="true" class="theme-toggle__icon">{{ ICONS[option] }}</span>
         <span class="theme-toggle__text">{{ COPY.theme[option] }}</span>
      </label>
   </fieldset>
</template>

<script lang="ts" setup>
import type { ThemePreference } from "~/composables/useTheme"

/// Radios in a fieldset rather than three buttons: this is a choice of one
/// from three, and the native control brings arrow-key navigation and the
/// correct screen-reader announcement with it. Three buttons would need
/// role="radiogroup" plus hand-written key handling to reach parity.

const uid = useId()
const { preference, setTheme, sync } = useTheme()

const ICONS: Record<ThemePreference, string> = {
   system: "◐",
   light: "☀",
   dark: "☾",
}

// The head script has already applied the stored preference to <html>;
// this catches the control up so the highlighted option matches the page.
onMounted(sync)
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.theme-toggle {
   display: flex;
   gap: px-to-rem(2);
   padding: px-to-rem(3);
   border: 1px solid var(--line);
   border-radius: var(--radius-pill);
   background-color: var(--surface-sunken);

   &__option {
      display: flex;
      align-items: center;
      gap: var(--space-3xs);
      padding: px-to-rem(5) var(--space-2xs);
      border-radius: var(--radius-pill);
      color: var(--muted);
      font-size: px-to-rem(13);
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transition: color var(--duration) var(--ease), background-color var(--duration) var(--ease);

      &:hover {
         color: var(--ink);
      }
   }

   &__option--active {
      background-color: var(--surface);
      box-shadow: var(--shadow-sm);
      color: var(--ink);
      font-weight: var(--weight-label);
   }

   // The input itself is visually hidden, so the ring has to be drawn on
   // the label it is inside — otherwise keyboard focus is invisible here.
   &__option:has(.theme-toggle__input:focus-visible) {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
   }

   &__icon {
      font-size: px-to-rem(14);
   }

   // Labels are for orientation on a wide header; the icons carry the
   // meaning once space runs out.
   @media (width < 40rem) {
      &__text {
         position: absolute;
         inline-size: 1px;
         block-size: 1px;
         margin: -1px;
         clip-path: inset(50%);
         overflow: hidden;
      }

      // An icon on its own is a target a few millimetres across. The
      // padding below is what makes each option tappable; keep it in step
      // with the SSR placeholder in `layouts/default.vue`, which reserves
      // the resulting 132 x 36 box.
      &__option {
         justify-content: center;
         min-inline-size: px-to-rem(40);
         padding-block: px-to-rem(7);
      }
   }
}
</style>
