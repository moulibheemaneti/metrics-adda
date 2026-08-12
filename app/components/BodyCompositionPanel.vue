<template>
   <section class="body stack stack--tight" :aria-labelledby="`${uid}-heading`">
      <div class="card card--panel stack stack--tight">
         <h2 :id="`${uid}-heading`" class="body__heading">
            {{ COPY.body.heading }}
         </h2>
         <p class="body__lede">
            {{ COPY.body.lede }}
         </p>

         <div class="body__inputs">
            <fieldset class="option-group">
               <legend class="option-group__legend">
                  {{ COPY.body.sexLabel }}
               </legend>
               <div class="body__radios">
                  <label v-for="option in SEXES" :key="option" class="body__radio">
                     <input
                        v-model="sex"
                        class="radio-dot"
                        type="radio"
                        :name="`${uid}-sex`"
                        :value="option"
                     />
                     <span>{{ COPY.body.sexes[option] }}</span>
                  </label>
               </div>
            </fieldset>

            <div class="field">
               <label class="field__label" :for="`${uid}-age`">
                  {{ COPY.body.ageLabel }} ({{ COPY.body.years }})
               </label>
               <input
                  :id="`${uid}-age`"
                  v-model="age"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
               />
            </div>

            <div class="field">
               <label class="field__label" :for="`${uid}-activity`">
                  {{ COPY.body.activityLabel }}
               </label>
               <select
                  :id="`${uid}-activity`"
                  v-model="activity"
                  class="control control--select"
               >
                  <option v-for="option in ACTIVITY_LEVELS" :key="option" :value="option">
                     {{ COPY.body.activities[option] }}
                  </option>
               </select>
            </div>
         </div>

         <p class="body__note">
            {{ COPY.body.sexNote }}
         </p>

         <!-- Optional, and left blank on purpose. A seeded waist would
              read as a measurement of the reader rather than a prompt. -->
         <h3 class="body__group-heading">
            {{ COPY.body.measurementsHeading }}
         </h3>
         <p class="body__note">
            {{ COPY.body.measurementsHint }}
         </p>

         <div class="body__inputs">
            <div class="field">
               <label class="field__label" :for="`${uid}-waist`">
                  {{ COPY.body.waistLabel }} ({{ lengthUnit }})
               </label>
               <input
                  :id="`${uid}-waist`"
                  v-model="waist"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :aria-describedby="`${uid}-waist-hint`"
               />
               <p :id="`${uid}-waist-hint`" class="field__hint">
                  {{ COPY.body.waistHint }}
               </p>
            </div>

            <div class="field">
               <label class="field__label" :for="`${uid}-neck`">
                  {{ COPY.body.neckLabel }} ({{ lengthUnit }})
               </label>
               <input
                  :id="`${uid}-neck`"
                  v-model="neck"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :aria-describedby="`${uid}-neck-hint`"
               />
               <p :id="`${uid}-neck-hint`" class="field__hint">
                  {{ COPY.body.neckHint }}
               </p>
            </div>

            <div class="field">
               <label class="field__label" :for="`${uid}-hip`">
                  {{ COPY.body.hipLabel }} ({{ lengthUnit }})
               </label>
               <input
                  :id="`${uid}-hip`"
                  v-model="hip"
                  class="control control--numeric"
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  :aria-describedby="`${uid}-hip-hint`"
               />
               <p :id="`${uid}-hip-hint`" class="field__hint">
                  {{ COPY.body.hipHint }}
               </p>
            </div>
         </div>
      </div>

      <div class="card card--panel stack stack--tight">
         <p v-if="!sex" class="body__prompt">
            {{ COPY.body.sexPrompt }}
         </p>
         <p v-else-if="!isAdult" class="notice">
            {{ COPY.body.adultsOnly }}
         </p>

         <template v-else>
            <!-- Body composition -->
            <h3 class="body__group-heading">
               {{ COPY.body.compositionHeading }}
            </h3>

            <p v-if="navyIssue === 'missing'" class="field__hint">
               {{ COPY.body.needsWaistNeck }}
            </p>
            <p v-else-if="navyIssue === 'hip'" class="field__hint">
               {{ COPY.body.needsHip }}
            </p>
            <p v-else-if="navyIssue === 'waistUnderNeck'" class="notice">
               {{ COPY.body.waistUnderNeck }}
            </p>
            <p v-else-if="navyIssue === 'implausible'" class="notice">
               {{ COPY.body.implausible }}
            </p>

            <!-- One scale, for the headline number only. Four bars would
                 turn a result card into a dashboard. -->
            <div v-if="bodyFat !== null" class="body__scale">
               <div class="body__bands">
                  <span
                     v-for="band in fatBands"
                     :key="band.id"
                     class="body__band"
                     :class="{ 'body__band--active': band.id === fatCategory }"
                     :style="{ flexGrow: band.width }"
                  />
               </div>
               <span class="body__marker" :style="{ insetInlineStart: fatMarkerOffset }" />
            </div>

            <ul v-if="compositionRows.length" class="body__grid">
               <li v-for="entry in compositionRows" :key="entry.key" class="stat">
                  <span class="stat__value">{{ entry.value }}</span>
                  <span class="stat__label">
                     {{ entry.label }}
                     <span v-if="entry.note" class="stat__note">({{ entry.note }})</span>
                  </span>
               </li>
            </ul>

            <p v-if="ffmiValue !== null" class="body__note">
               {{ COPY.body.ffmiExplainer }}
            </p>

            <!-- Shape and risk -->
            <h3 class="body__group-heading">
               {{ COPY.body.shapeHeading }}
            </h3>

            <p v-if="waistCm === null" class="field__hint">
               {{ COPY.body.needsWaist }}
            </p>
            <p v-else-if="hipCm === null" class="field__hint">
               {{ COPY.body.needsHipForWhr }}
            </p>

            <ul v-if="shapeRows.length" class="body__grid">
               <li v-for="entry in shapeRows" :key="entry.key" class="stat">
                  <span class="stat__value">{{ entry.value }}</span>
                  <span class="stat__label">
                     {{ entry.label }}
                     <span v-if="entry.note" class="stat__note">({{ entry.note }})</span>
                  </span>
               </li>
            </ul>

            <!-- Daily energy -->
            <h3 class="body__group-heading">
               {{ COPY.body.energyHeading }}
            </h3>

            <ul v-if="energyRows.length" class="body__grid">
               <li v-for="entry in energyRows" :key="entry.key" class="stat">
                  <span class="stat__value">{{ entry.value }}</span>
                  <span class="stat__label">
                     {{ entry.label }}
                     <span v-if="entry.note" class="stat__note">({{ entry.note }})</span>
                  </span>
               </li>
            </ul>
            <p v-else class="field__hint">
               {{ COPY.body.needsAge }}
            </p>

            <!-- Other indices -->
            <h3 class="body__group-heading">
               {{ COPY.body.indicesHeading }}
            </h3>

            <ul v-if="indexRows.length" class="body__grid">
               <li v-for="entry in indexRows" :key="entry.key" class="stat">
                  <span class="stat__value">{{ entry.value }}</span>
                  <span class="stat__label">
                     {{ entry.label }}
                     <span v-if="entry.note" class="stat__note">({{ entry.note }})</span>
                  </span>
               </li>
            </ul>

            <!-- Target weight. The BMI-derived range leads; the four
                 formulas sit under it as a spread, not a target. -->
            <template v-if="idealRows.length">
               <h3 class="body__group-heading">
                  {{ COPY.body.idealWeightHeading }}
               </h3>
               <table class="data-table">
                  <thead>
                     <tr>
                        <th scope="col">
                           {{ COPY.body.formulaColumn }}
                        </th>
                        <th scope="col">
                           {{ COPY.body.weightColumn }}
                        </th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr v-for="entry in idealRows" :key="entry.key">
                        <th scope="row">
                           {{ entry.label }}
                        </th>
                        <td>{{ entry.value }}</td>
                     </tr>
                  </tbody>
               </table>
               <p class="body__note">
                  {{ COPY.body.idealWeightNote }}
               </p>
            </template>

            <p class="visually-hidden" aria-live="polite">
               {{ spoken }}
            </p>
         </template>

         <p class="body__disclaimer">
            {{ COPY.body.disclaimer }}
         </p>
      </div>
   </section>
</template>

<script lang="ts" setup>
/// The advanced half of the BMI tool.
///
/// Height, weight and the unit system are typed once in the parent and
/// arrive as props, so flipping between basic and advanced never loses
/// what someone entered and there is no lifted state to keep in step.
///
/// Every reading is `number | null` all the way from `utils/body.ts` to
/// the template, and a null one is simply not in the list. That is what
/// makes an absent tape measurement degrade into a missing row rather
/// than a NaN — and why each group renders a line saying which field
/// would bring its rows back.

const props = defineProps<{
   /** Height in metres, or null while the field is unusable. */
   metres: number | null
   /** Weight in kilograms. */
   kilograms: number | null
   /** The parent's BMI, so Deurenberg is not recomputed from a second source. */
   bmi: number | null
   system: "metric" | "imperial"
   population: BmiPopulation
}>()

const uid = useId()

/// Seeded like the rest of the site so the panel reads as a worked
/// example the moment it opens — except `sex`, which stays unset. There
/// is no neutral default, and picking one silently would be a judgement
/// the tool should not make. `sexPrompt` explains the gap instead.
const sex = ref<Sex | null>(null)
const age = ref("30")
const activity = ref<ActivityLevel>(DEFAULT_ACTIVITY)
const waist = ref("")
const neck = ref("")
const hip = ref("")

const lengthUnit = computed(() =>
   props.system === "metric" ? COPY.bmi.centimetres : COPY.bmi.inches)

const massUnit = computed(() =>
   props.system === "metric" ? COPY.bmi.kilograms : COPY.bmi.pounds)

/** A circumference in centimetres, whichever unit it was typed in. */
const toCentimetres = (text: string): number | null => {
   const value = parseQuantity(text)

   if (value === null || value <= 0) return null

   return props.system === "metric" ? value : convert(value, "in", "cm", DIMENSIONS.length)
}

const waistCm = computed(() => toCentimetres(waist.value))
const neckCm = computed(() => toCentimetres(neck.value))
const hipCm = computed(() => toCentimetres(hip.value))

const heightCm = computed(() =>
   props.metres === null ? null : convert(props.metres, "m", "cm", DIMENSIONS.length))

const ageYears = computed(() => parseQuantity(age.value))
const isAdult = computed(() => ageYears.value !== null && ageYears.value >= ADULT_MIN_AGE)

/// --------------------------------------------------
/// Body fat
/// --------------------------------------------------

const bodyFatNavyValue = computed(() => {
   if (!sex.value || heightCm.value === null) return null
   if (waistCm.value === null || neckCm.value === null) return null
   if (sex.value === "female" && hipCm.value === null) return null

   return bodyFatNavy({
      sex: sex.value,
      heightCm: heightCm.value,
      waistCm: waistCm.value,
      neckCm: neckCm.value,
      hipCm: hipCm.value ?? undefined,
   })
})

/**
 * Why the tape estimate is missing, when it is.
 *
 * A vanished row on its own is the confusing case, and the two rejection
 * reasons are genuinely different: one is a mis-read tape the reader can
 * fix, the other is a body outside what the formula was fitted on.
 */
const navyIssue = computed<"missing" | "hip" | "waistUnderNeck" | "implausible" | null>(() => {
   if (!sex.value) return null
   if (waistCm.value === null || neckCm.value === null) return "missing"
   if (sex.value === "female" && hipCm.value === null) return "hip"

   const girth = sex.value === "male"
      ? waistCm.value - neckCm.value
      : waistCm.value + (hipCm.value ?? 0) - neckCm.value

   if (girth <= 0) return "waistUnderNeck"

   return bodyFatNavyValue.value === null ? "implausible" : null
})

const bodyFatDeurenbergValue = computed(() => {
   if (!sex.value || props.bmi === null || ageYears.value === null) return null

   return bodyFatDeurenberg(props.bmi, ageYears.value, sex.value)
})

/** The tape method leads when it is available — it measures shape, not weight. */
const bodyFat = computed(() => bodyFatNavyValue.value ?? bodyFatDeurenbergValue.value)

const fatCategory = computed(() =>
   bodyFat.value === null || !sex.value ? null : bodyFatCategory(bodyFat.value, sex.value))

const fatBands = computed(() =>
   sex.value
      ? bandWidths(BODY_FAT_BANDS[sex.value], BODY_FAT_SCALE_MIN, BODY_FAT_SCALE_MAX)
      : [])

const fatMarkerOffset = computed(() =>
   `${bandPosition(bodyFat.value ?? 0, BODY_FAT_SCALE_MIN, BODY_FAT_SCALE_MAX) * 100}%`)

/// --------------------------------------------------
/// Lean mass
/// --------------------------------------------------

const leanMass = computed(() => {
   if (!sex.value || props.kilograms === null || heightCm.value === null) return null

   return leanBodyMassBoer(props.kilograms, heightCm.value, sex.value)
})

const fatMass = computed(() =>
   leanMass.value === null || props.kilograms === null ? null : props.kilograms - leanMass.value)

const ffmiValue = computed(() =>
   leanMass.value === null || props.metres === null
      ? null
      : fatFreeMassIndex(leanMass.value, props.metres))

const ffmiNormalised = computed(() =>
   ffmiValue.value === null || props.metres === null
      ? null
      : normalisedFfmi(ffmiValue.value, props.metres))

/// --------------------------------------------------
/// Energy
/// --------------------------------------------------

/// Katch-McArdle when lean mass is known, Mifflin otherwise. This is what
/// makes the tape measurements pay off twice: they sharpen the body fat
/// figure and the calorie figure from the same three numbers.
const bmr = computed(() => {
   if (leanMass.value !== null) return bmrKatchMcArdle(leanMass.value)
   if (!sex.value || props.kilograms === null || heightCm.value === null) return null
   if (ageYears.value === null) return null

   return bmrMifflin(props.kilograms, heightCm.value, ageYears.value, sex.value)
})

const bmrNote = computed(() =>
   leanMass.value !== null ? COPY.body.bmrKatchNote : COPY.body.bmrMifflinNote)

const dailyEnergy = computed(() => (bmr.value === null ? null : tdee(bmr.value, activity.value)))

/// --------------------------------------------------
/// Display
/// --------------------------------------------------

/** Mass shown back in whichever units the reader is working in. */
const inReadingUnits = (kg: number): number =>
   props.system === "metric" ? kg : convert(kg, "kg", "lb", DIMENSIONS.mass)

const percent = (value: number): string => `${formatDecimal(value, 1)}${COPY.body.percent}`
const ratio = (value: number): string => formatDecimal(value, 2)
const index = (value: number): string => formatDecimal(value, 1)
const mass = (kg: number): string => `${formatDecimal(inReadingUnits(kg), 1)} ${massUnit.value}`

/// Rounded to the nearest ten. A method that varies by 10% between people
/// of identical size, printed as "2,555.5625", is a lie told in
/// typography.
const energy = (value: number): string =>
   `${formatCount(Math.round(value / 10) * 10)} ${COPY.body.kcalPerDay}`

interface ResultRow {
   key: string
   label: string
   value: string
   note?: string
}

/** A row, or nothing at all — a metric whose inputs are missing must not exist. */
const row = (
   key: string,
   label: string,
   value: number | null,
   format: (value: number) => string,
   note?: string,
): ResultRow[] => (value === null ? [] : [{ key, label, value: format(value), note }])

const compositionRows = computed<ResultRow[]>(() => [
   ...row(
      "navy",
      COPY.body.bodyFatNavyLabel,
      bodyFatNavyValue.value,
      percent,
      fatCategory.value && bodyFatNavyValue.value !== null
         ? `${COPY.body.bodyFatNavyNote} — ${COPY.body.bodyFatCategories[fatCategory.value]}`
         : COPY.body.bodyFatNavyNote,
   ),
   ...row(
      "deurenberg",
      COPY.body.bodyFatDeurenbergLabel,
      bodyFatDeurenbergValue.value,
      percent,
      COPY.body.bodyFatDeurenbergNote,
   ),
   ...row("lean", COPY.body.leanMassLabel, leanMass.value, mass),
   ...row("fat", COPY.body.fatMassLabel, fatMass.value, mass),
   ...row("ffmi", COPY.body.ffmiLabel, ffmiValue.value, index),
   ...row(
      "ffmiNormalised",
      COPY.body.ffmiNormalisedLabel,
      ffmiNormalised.value,
      index,
      COPY.body.ffmiNormalisedNote,
   ),
])

const shapeRows = computed<ResultRow[]>(() => {
   const whtr = waistCm.value === null || heightCm.value === null
      ? null
      : waistToHeightRatio(waistCm.value, heightCm.value)

   const whr = waistCm.value === null || hipCm.value === null
      ? null
      : waistToHipRatio(waistCm.value, hipCm.value)

   const whtrBand = whtr === null ? null : whtrCategory(whtr)
   const whrBand = whr === null || !sex.value ? null : whrCategory(whr, sex.value)

   return [
      ...row(
         "whtr",
         COPY.body.whtrLabel,
         whtr,
         ratio,
         whtrBand ? COPY.body.whtrCategories[whtrBand] : COPY.body.whtrNote,
      ),
      ...row(
         "whr",
         COPY.body.whrLabel,
         whr,
         ratio,
         whrBand ? COPY.body.whrCategories[whrBand] : undefined,
      ),
   ]
})

const energyRows = computed<ResultRow[]>(() => [
   ...row("bmr", COPY.body.bmrLabel, bmr.value, energy, bmrNote.value),
   ...row(
      "tdee",
      COPY.body.tdeeLabel,
      dailyEnergy.value,
      energy,
      COPY.body.activities[activity.value],
   ),
])

const indexRows = computed<ResultRow[]>(() => [
   ...row(
      "prime",
      COPY.body.bmiPrimeLabel,
      props.bmi === null ? null : bmiPrime(props.bmi, props.population),
      ratio,
      COPY.body.bmiPrimeNote,
   ),
   ...row(
      "ponderal",
      COPY.body.ponderalLabel,
      props.metres === null || props.kilograms === null
         ? null
         : ponderalIndex(props.kilograms, props.metres),
      index,
      COPY.body.ponderalNote,
   ),
   ...row(
      "newBmi",
      COPY.body.newBmiLabel,
      props.metres === null || props.kilograms === null
         ? null
         : newBmi(props.kilograms, props.metres),
      index,
      COPY.body.newBmiNote,
   ),
])

const idealRows = computed<ResultRow[]>(() => {
   if (!sex.value || props.metres === null) return []

   return idealWeights(props.metres, sex.value).map((entry) => ({
      key: entry.id,
      label: COPY.body.idealWeights[entry.id],
      value: mass(entry.kilograms),
   }))
})

/// Two or three headline figures, never the whole grid — a live region
/// that reads fifteen numbers on every keystroke is worse than none.
const spoken = computed(() => {
   const parts: string[] = []

   if (bodyFat.value !== null && fatCategory.value) {
      parts.push(
         `${COPY.body.bodyFatNavyLabel} ${percent(bodyFat.value)}, ${COPY.body.bodyFatCategories[fatCategory.value]}`,
      )
   }

   if (dailyEnergy.value !== null) {
      parts.push(`${COPY.body.tdeeLabel} ${energy(dailyEnergy.value)}`)
   }

   return parts.join(". ")
})
</script>

<style scoped lang="scss">
@use "../assets/scss/abstracts" as *;

.body {
   &__heading {
      font-size: px-to-rem(20);
   }

   &__lede,
   &__note,
   &__prompt {
      color: var(--ink-soft);
      font-size: px-to-rem(14);
   }

   &__note {
      color: var(--muted);
      font-size: px-to-rem(13);
   }

   &__group-heading {
      margin-block-start: var(--space-2xs);
      color: var(--ink-soft);
      font-size: px-to-rem(13);
      font-weight: var(--weight-label);
      letter-spacing: 0.04em;
      text-transform: uppercase;
   }

   &__inputs {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-sm);
      align-items: start;

      @media (width >= 40rem) {
         grid-template-columns: repeat(3, 1fr);
      }
   }

   &__radios {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
   }

   &__radio {
      display: inline-flex;
      gap: var(--space-3xs);
      align-items: center;
      cursor: pointer;
   }

   &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(px-to-rem(150), 1fr));
      gap: var(--space-2xs);
      margin: 0;
      padding: 0;
      list-style: none;
   }

   // The same banded-scale language as the BMI bar above it, and for the
   // same reason: body fat is not "more is worse" on one axis either.
   &__scale {
      position: relative;
      padding-block-end: px-to-rem(10);
   }

   &__bands {
      display: flex;
      gap: px-to-rem(2);
   }

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

   &__disclaimer {
      color: var(--muted);
      font-size: px-to-rem(13);
   }
}
</style>
