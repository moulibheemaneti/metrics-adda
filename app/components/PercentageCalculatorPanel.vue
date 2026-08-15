<template>
   <div class="percentage stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <!-- Radios rather than a select: four short options that a reader
              needs to compare before choosing, and a fieldset gives them
              arrow keys and the "1 of 4" announcement for free. -->
         <fieldset class="percentage__modes">
            <legend class="field__label">
               {{ COPY.percentage.modeLabel }}
            </legend>
            <label v-for="option in PERCENTAGE_MODES" :key="option" class="percentage__mode">
               <input
                  v-model="mode"
                  class="percentage__mode-input radio-dot"
                  type="radio"
                  :name="`${uid}-mode`"
                  :value="option"
               />
               <span>{{ COPY.percentage.modes[option] }}</span>
            </label>
         </fieldset>

         <div class="percentage__inputs">
            <div class="field">
               <label class="field__label" :for="`${uid}-first`">
                  {{ COPY.percentage.firstLabels[mode] }}
               </label>
               <input
                  :id="`${uid}-first`"
                  v-model="first"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
               />
            </div>

            <div class="field">
               <label class="field__label" :for="`${uid}-second`">
                  {{ COPY.percentage.secondLabels[mode] }}
               </label>
               <input
                  :id="`${uid}-second`"
                  v-model="second"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
               />
            </div>
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <p v-if="!hasBothNumbers" class="percentage__note">
            {{ COPY.percentage.empty }}
         </p>

         <p v-else-if="readouts === null" class="percentage__note">
            {{ undefinedNote }}
         </p>

         <ul v-else class="percentage__results">
            <li v-for="row in readouts" :key="row.id" class="percentage__result">
               <p class="field__label">
                  {{ COPY.percentage.rows[row.id] }}
               </p>
               <p class="percentage__readout">
                  <span class="percentage__value">
                     {{ formatQuantity(row.value) }}<template v-if="row.unit === 'percent'">%</template>
                  </span>
                  <!-- Only the change row carries a direction. The other
                       three cannot fall, so a label there would say
                       nothing. -->
                  <span v-if="row.id === 'change'" class="percentage__direction">
                     {{ COPY.percentage.directions[changeDirection(row.value)] }}
                  </span>
               </p>
               <p class="percentage__caption">
                  {{ caption(row) }}
               </p>
            </li>
         </ul>

         <p class="visually-hidden" aria-live="polite">
            {{ spoken }}
         </p>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { PercentageReadout } from "~/utils/percentage"

/// The maths lives in `utils/percentage.ts`; this file is the two fields,
/// the labels that change with the question, and the answer. The split is
/// the same one the converters make — nothing here knows what a percentage
/// is, and nothing there knows what is on screen.

const uid = useId()

const mode = ref<PercentageMode>("of")

// Seeded so the page server-renders a worked example rather than an empty
// prompt, matching the converters and the BMI panel. 20% of 80 is 16 —
// small enough to check in your head, which is the point of an example.
const first = ref("20")
const second = ref("80")

const firstValue = computed(() => parseQuantity(first.value))
const secondValue = computed(() => parseQuantity(second.value))

/// Blank and undefined are different states and get different messages: a
/// half-typed field is not an error, and telling someone their sum has no
/// answer while they are still entering it would be wrong as well as rude.
const hasBothNumbers = computed(() => firstValue.value !== null && secondValue.value !== null)

const readouts = computed<PercentageReadout[] | null>(() => {
   if (!hasBothNumbers.value) return null

   return solvePercentage(mode.value, firstValue.value as number, secondValue.value as number)
})

/** Which zero the reader hit — the two modes fail for different reasons. */
const undefinedNote = computed(() =>
   (mode.value === "change" ? COPY.percentage.undefinedChange : COPY.percentage.undefinedRatio))

/**
 * The answer as a sentence.
 *
 * Filled from the parsed numbers rather than the raw fields, so a pasted
 * "1,000" reads back as "1,000" and not as the string with the comma in an
 * unpredictable place.
 */
function caption(row: PercentageReadout): string {
   return COPY.percentage.captions[row.id]
      .replace("{a}", formatQuantity(firstValue.value ?? 0))
      .replace("{b}", formatQuantity(secondValue.value ?? 0))
      .replace("{result}", formatQuantity(row.value))
}

/// The captions already read as sentences, so the live region speaks them
/// rather than restating the numbers in a second form.
const spoken = computed(() => {
   if (!hasBothNumbers.value) return ""
   if (readouts.value === null) return undefinedNote.value

   return readouts.value.map(caption).join(" ")
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.percentage {
   &__modes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs) var(--space-sm);
      align-items: center;
      border: 0;
   }

   &__mode {
      display: inline-flex;
      gap: var(--space-3xs);
      align-items: center;
      cursor: pointer;
   }

   &__inputs {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-sm);

      @media (width >= 40rem) {
         grid-auto-flow: column;
         grid-auto-columns: 1fr;
      }
   }

   &__note {
      color: var(--muted);
   }

   &__results {
      display: grid;
      gap: var(--space-sm);
      list-style: none;

      // Adjust mode is the only one with two rows, and they are equal
      // answers rather than a primary and a secondary — so they sit side
      // by side once there is room, not stacked with one on top.
      @media (width >= 40rem) {
         grid-auto-flow: column;
         grid-auto-columns: 1fr;
      }
   }

   &__readout {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
      align-items: baseline;
   }

   &__value {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 5vw, 2.5rem);
      font-variant-numeric: tabular-nums;
      font-weight: var(--weight-heading);
      line-height: 1;
   }

   &__direction {
      color: var(--ink-soft);
      font-weight: var(--weight-label);
   }

   &__caption {
      color: var(--ink-soft);
      font-size: px-to-rem(14);
   }
}
</style>
