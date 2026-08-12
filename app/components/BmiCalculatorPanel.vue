<template>
   <div class="bmi stack stack--tight">
      <div class="card card--panel stack stack--tight">
         <fieldset class="bmi__system">
            <legend class="field__label">
               {{ COPY.bmi.systemLabel }}
            </legend>
            <label v-for="option in SYSTEMS" :key="option" class="bmi__system-option">
               <input
                  v-model="system"
                  class="bmi__system-input"
                  type="radio"
                  :name="`${uid}-system`"
                  :value="option"
               />
               <span>{{ COPY.bmi[option] }}</span>
            </label>
         </fieldset>

         <div class="bmi__inputs">
            <!-- Metric height is one field; imperial is the two-number
                 composite people actually speak, the same split
                 HeightConverter makes. -->
            <div v-if="system === 'metric'" class="field">
               <label class="field__label" :for="`${uid}-cm`">
                  {{ COPY.bmi.heightLabel }} ({{ COPY.bmi.centimetres }})
               </label>
               <input
                  :id="`${uid}-cm`"
                  v-model="centimetres"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
               />
            </div>

            <template v-else>
               <div class="field">
                  <label class="field__label" :for="`${uid}-ft`">
                     {{ COPY.bmi.heightLabel }} ({{ COPY.bmi.feet }})
                  </label>
                  <input
                     :id="`${uid}-ft`"
                     v-model="feet"
                     class="control control--numeric"
                     type="text"
                     inputmode="decimal"
                     autocomplete="off"
                  />
               </div>
               <div class="field">
                  <label class="field__label" :for="`${uid}-in`">
                     {{ COPY.bmi.heightLabel }} ({{ COPY.bmi.inches }})
                  </label>
                  <input
                     :id="`${uid}-in`"
                     v-model="inches"
                     class="control control--numeric"
                     type="text"
                     inputmode="decimal"
                     autocomplete="off"
                  />
               </div>
            </template>

            <div class="field">
               <label class="field__label" :for="`${uid}-weight`">
                  {{ COPY.bmi.weightLabel }}
                  ({{ system === "metric" ? COPY.bmi.kilograms : COPY.bmi.pounds }})
               </label>
               <input
                  :id="`${uid}-weight`"
                  v-model="weight"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
               />
            </div>
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <p v-if="bmi === null" class="bmi__empty">
            {{ COPY.bmi.empty }}
         </p>

         <template v-else>
            <p class="bmi__readout">
               <span class="bmi__value">{{ formatQuantity(bmi, 3) }}</span>
               <span class="bmi__category">{{ COPY.bmi.categories[category] }}</span>
            </p>

            <!-- A banded scale, not a filled meter. BMI is not "more is
                 worse" on one axis — underweight and obese both sit away
                 from the middle — so a left-to-right gradient would read
                 as though the right-hand end were the goal. -->
            <div class="bmi__scale">
               <div class="bmi__bands">
                  <span
                     v-for="band in bands"
                     :key="band.id"
                     class="bmi__band"
                     :class="{ 'bmi__band--active': band.id === category }"
                     :style="{ flexGrow: band.width }"
                  />
               </div>
               <span class="bmi__marker" :style="{ insetInlineStart: markerOffset }" />
            </div>

            <p v-if="range" class="bmi__range">
               {{ COPY.bmi.rangeLabel }}:
               <strong>
                  {{ formatQuantity(rangeLow, 3) }}–{{ formatQuantity(rangeHigh, 3) }}
                  {{ system === "metric" ? COPY.bmi.kilograms : COPY.bmi.pounds }}
               </strong>
            </p>

            <p class="visually-hidden" aria-live="polite">
               {{ spoken }}
            </p>
         </template>

         <p class="bmi__disclaimer">
            {{ COPY.bmi.disclaimer }}
         </p>
      </div>
   </div>
</template>

<script lang="ts" setup>
/// All conversion goes through `utils/units.ts`. Nothing here restates
/// what a pound or an inch is — the exact definitions live in one place,
/// and the height converter already proved the feet-and-inches split.

const SYSTEMS = ["metric", "imperial"] as const

const uid = useId()

const system = ref<typeof SYSTEMS[number]>("metric")

// Seeded so the page server-renders a worked example rather than an empty
// prompt, matching the converters and the case converter.
const centimetres = ref("175")
const feet = ref("5")
const inches = ref("9")
const weight = ref("70")

/** Height in metres, from whichever set of fields is on screen. */
const metres = computed<number | null>(() => {
   if (system.value === "metric") {
      const value = parseQuantity(centimetres.value)

      return value === null ? null : convert(value, "cm", "m", DIMENSIONS.length)
   }

   const feetValue = parseQuantity(feet.value)
   const inchesValue = parseQuantity(inches.value)

   // Either field alone is a complete height — 6 ft, or 70 in — so only a
   // pair of blanks means "nothing entered".
   if (feetValue === null && inchesValue === null) return null

   return fromFeetInches(feetValue ?? 0, inchesValue ?? 0)
})

/** Weight in kilograms, whatever the reader typed it in. */
const kilograms = computed<number | null>(() => {
   const value = parseQuantity(weight.value)

   if (value === null) return null
   if (system.value === "metric") return value

   return convert(value, "lb", "kg", DIMENSIONS.mass)
})

const bmi = computed(() =>
   metres.value === null || kilograms.value === null
      ? null
      : calculateBmi(kilograms.value, metres.value),
)

const category = computed(() => bmiCategory(bmi.value ?? 0))
const bands = computed(() => bmiBandWidths())
const markerOffset = computed(() => `${bmiScalePosition(bmi.value ?? 0) * 100}%`)

const range = computed(() => (metres.value === null ? null : healthyWeightRange(metres.value)))

/** The healthy range, shown back in the units the reader is working in. */
const inReadingUnits = (kg: number): number =>
   system.value === "metric" ? kg : convert(kg, "kg", "lb", DIMENSIONS.mass)

const rangeLow = computed(() => inReadingUnits(range.value?.min ?? 0))
const rangeHigh = computed(() => inReadingUnits(range.value?.max ?? 0))

const spoken = computed(() => {
   if (bmi.value === null) return ""

   return `BMI ${formatQuantity(bmi.value, 3)}, ${COPY.bmi.categories[category.value]}`
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.bmi {
   &__system {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2xs);
      align-items: center;
      border: 0;
   }

   &__system-option {
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

   &__empty {
      color: var(--muted);
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

   &__category {
      color: var(--ink-soft);
      font-weight: var(--weight-label);
   }

   &__scale {
      position: relative;
      padding-block-end: px-to-rem(10);
   }

   &__bands {
      display: flex;
      gap: px-to-rem(2);
   }

   // Neutral by default, accent for the band the reader is in. Colour is
   // carrying "which band" here and nothing else — the red/amber/green
   // scale belongs to the password strength meter, where it means
   // something, and reusing it here would read as a verdict.
   &__band {
      block-size: px-to-rem(8);
      border-radius: var(--radius-pill);
      background-color: var(--surface-sunken);
   }

   &__band--active {
      background-color: var(--accent-solid);
   }

   &__marker {
      position: absolute;
      inset-block-start: px-to-rem(-3);
      inline-size: px-to-rem(2);
      block-size: px-to-rem(14);
      border-radius: var(--radius-pill);
      background-color: var(--ink);
      translate: -50%;
   }

   &__range,
   &__disclaimer {
      color: var(--ink-soft);
      font-size: px-to-rem(14);
   }

   &__disclaimer {
      color: var(--muted);
      font-size: px-to-rem(13);
   }
}
</style>
